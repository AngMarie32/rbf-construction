import { useRef, useState } from 'react';
// @ts-ignore - react-signature-canvas types are loose
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

interface Props {
  onComplete: (dataUrl: string, type: 'drawn' | 'typed') => void;
  signerName?: string;
}

export function SignaturePad({ onComplete, signerName }: Props) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [typed, setTyped] = useState(signerName || '');

  const handleApplyDrawn = () => {
    if (sigRef.current?.isEmpty()) return;
    const dataUrl = sigRef.current!.toDataURL('image/png');
    onComplete(dataUrl, 'drawn');
  };

  const handleApplyTyped = () => {
    if (!typed.trim()) return;
    // Render typed name as image
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 150;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1a202c';
    ctx.font = 'italic 56px "Brush Script MT", cursive';
    ctx.textBaseline = 'middle';
    ctx.fillText(typed, 20, 75);
    onComplete(canvas.toDataURL('image/png'), 'typed');
  };

  return (
    <Tabs defaultValue="draw" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="draw">Draw</TabsTrigger>
        <TabsTrigger value="type">Type</TabsTrigger>
      </TabsList>
      <TabsContent value="draw" className="space-y-3">
        <div className="border-2 border-dashed border-border rounded-lg bg-background">
          {/* @ts-ignore */}
          <SignatureCanvas
            ref={sigRef}
            penColor="#1a202c"
            canvasProps={{ width: 560, height: 200, className: 'w-full h-[200px]' }}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => sigRef.current?.clear()}>Clear</Button>
          <Button onClick={handleApplyDrawn} className="flex-1">Apply Signature</Button>
        </div>
      </TabsContent>
      <TabsContent value="type" className="space-y-3">
        <Label>Type your full name</Label>
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Your name" />
        <div className="border rounded-lg p-6 bg-background min-h-[100px] flex items-center">
          <span style={{ fontFamily: '"Brush Script MT", cursive', fontSize: 40, fontStyle: 'italic' }}>
            {typed || 'Preview'}
          </span>
        </div>
        <Button onClick={handleApplyTyped} className="w-full" disabled={!typed.trim()}>Apply Signature</Button>
      </TabsContent>
    </Tabs>
  );
}