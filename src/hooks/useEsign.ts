import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EsignEnvelope, EsignSigner, EsignField, EsignTemplate } from '@/types/esign';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useEnvelopes() {
  return useQuery({
    queryKey: ['esign-envelopes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('esign_envelopes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EsignEnvelope[];
    },
  });
}

export function useEnvelope(id: string | undefined) {
  return useQuery({
    queryKey: ['esign-envelope', id],
    queryFn: async () => {
      if (!id) return null;
      const [env, sg, fl] = await Promise.all([
        supabase.from('esign_envelopes').select('*').eq('id', id).single(),
        supabase.from('esign_signers').select('*').eq('envelope_id', id).order('order_index'),
        supabase.from('esign_fields').select('*').eq('envelope_id', id),
      ]);
      if (env.error) throw env.error;
      return {
        envelope: env.data as EsignEnvelope,
        signers: (sg.data || []) as EsignSigner[],
        fields: (fl.data || []) as EsignField[],
      };
    },
    enabled: !!id,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ['esign-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('esign_templates')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name');
      if (error) throw error;
      return data as EsignTemplate[];
    },
  });
}

export function useCreateEnvelope() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      message?: string;
      signing_order?: 'parallel' | 'sequential';
      source_type?: string;
      source_id?: string;
      project_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('esign_envelopes')
        .insert({ ...input, created_by: user?.id, status: 'draft' })
        .select()
        .single();
      if (error) throw error;
      return data as EsignEnvelope;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['esign-envelopes'] }),
  });
}

export function useUploadEnvelopePdf() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ envelopeId, file }: { envelopeId: string; file: File }) => {
      const path = `${user!.id}/${envelopeId}/original.pdf`;
      const { error: upErr } = await supabase.storage
        .from('esign-documents')
        .upload(path, file, { upsert: true, contentType: 'application/pdf' });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from('esign_envelopes')
        .update({ original_pdf_path: path })
        .eq('id', envelopeId);
      if (updErr) throw updErr;
      return path;
    },
  });
}

export function useGetSignedPdfUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['esign-pdf-url', path],
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from('esign-documents')
        .createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
  });
}

export function useSendEnvelope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (envelopeId: string) => {
      const { data, error } = await supabase.functions.invoke('esign-send-invitations', {
        body: { envelopeId, appUrl: window.location.origin },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['esign-envelopes'] });
      toast.success('Invitations sent');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to send'),
  });
}

export function useDeleteEnvelope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('esign_envelopes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['esign-envelopes'] });
      toast.success('Envelope deleted');
    },
  });
}

export function useAuditEvents(envelopeId: string | undefined) {
  return useQuery({
    queryKey: ['esign-audit', envelopeId],
    queryFn: async () => {
      if (!envelopeId) return [];
      const { data, error } = await supabase
        .from('esign_audit_events')
        .select('*')
        .eq('envelope_id', envelopeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!envelopeId,
  });
}