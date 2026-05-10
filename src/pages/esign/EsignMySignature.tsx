import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignaturePad } from '@/components/esign/SignaturePad';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export default function EsignMySignature() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [sig, setSig] = useState<{ data: string; type: 'drawn' | 'typed' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('user_esign_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name || '');
        if (data.signature_data) {
          setSig({ data: data.signature_data, type: (data.signature_type as any) || 'drawn' });
        }
      } else {
        setFullName((user.user_metadata as any)?.name || user.email || '');
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!fullName.trim()) return toast.error('Name required');
    if (!sig) return toast.error('Capture a signature first');
    setSaving(true);
    const { error } = await supabase
      .from('user_esign_preferences')
      .upsert({
        user_id: user.id,
        full_name: fullName.trim(),
        signature_data: sig.data,
        signature_type: sig.type,
      });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Signature saved');
    navigate('/esign');
  };

  const clear = async () => {
    if (!user) return;
    await supabase.from('user_esign_preferences').delete().eq('user_id', user.id);
    setSig(null);
    toast.success('Saved signature removed');
  };

  return (
    <Layout title="My Signature" subtitle="Save your default name and signature for one-click signing">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card className="p-6 space-y-4">
          <div>
            <Label>Full name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={120}
              placeholder="Jane Doe"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used to prefill your name when you add yourself as a signer.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Saved signature</Label>
            {sig ? (
              <div className="border rounded-lg p-4 bg-background flex items-center justify-between gap-4">
                <img src={sig.data} alt="Saved signature" className="h-20 object-contain" />
                <Button variant="ghost" size="sm" onClick={() => setSig(null)}>
                  Replace
                </Button>
              </div>
            ) : (
              <SignaturePad
                signerName={fullName}
                onComplete={(data, type) => {
                  setSig({ data, type });
                  toast.success('Signature captured — click Save to store it');
                }}
              />
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => navigate('/esign')}>Cancel</Button>
            {sig && (
              <Button variant="ghost" onClick={clear} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-1" /> Remove saved
              </Button>
            )}
            <Button onClick={save} disabled={saving || loading} className="flex-1">
              {saving ? 'Saving…' : 'Save signature'}
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}