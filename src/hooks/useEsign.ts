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
      document_type?: string;
      company?: string;
      payment_app_number?: string;
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
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['esign-envelopes'] });
      const failed = (data?.results || []).filter((r: any) => r.ok === false);
      if (data?.warning) {
        toast.warning('Some emails were rejected', {
          description: data.warning,
          duration: 12000,
        });
      } else {
        toast.success('Invitations sent');
      }
      // Always show direct signing links so the user can test/share manually
      for (const r of (data?.results || [])) {
        if (r.link) {
          const status = r.ok ? 'sent' : 'not delivered';
          toast.message(`${r.signer} (${status})`, {
            description: r.link,
            duration: 15000,
            action: {
              label: 'Copy link',
              onClick: () => navigator.clipboard.writeText(r.link),
            },
          });
        }
      }
      if (failed.length && !data?.warning) {
        toast.error(`${failed.length} invitation${failed.length === 1 ? '' : 's'} failed`);
      }
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to send'),
  });
}

export function useResendInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { envelopeId: string; signerId?: string }) => {
      const { data, error } = await supabase.functions.invoke('esign-send-invitations', {
        body: { envelopeId: input.envelopeId, signerId: input.signerId, resend: true, appUrl: window.location.origin },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['esign-envelopes'] });
      const failed = (data?.results || []).filter((r: any) => r.ok === false);
      if (data?.warning) {
        toast.warning('Some emails were rejected', { description: data.warning, duration: 12000 });
      } else {
        toast.success('Invitation resent');
      }
      for (const r of (data?.results || [])) {
        if (r.link) {
          const status = r.ok ? 'sent' : 'not delivered';
          toast.message(`${r.signer} (${status})`, {
            description: r.link,
            duration: 15000,
            action: { label: 'Copy link', onClick: () => navigator.clipboard.writeText(r.link) },
          });
        }
      }
      if (failed.length && !data?.warning) {
        toast.error(`${failed.length} resend${failed.length === 1 ? '' : 's'} failed`);
      }
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to resend'),
  });
}

// ----- Document types (user-managed) -----
export function useDocumentTypes() {
  return useQuery({
    queryKey: ['esign-document-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('esign_document_types' as any)
        .select('*')
        .order('name');
      if (error) throw error;
      return ((data || []) as unknown) as { id: string; name: string }[];
    },
  });
}

export function useCreateDocumentType() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Name required');
      const { data, error } = await supabase
        .from('esign_document_types' as any)
        .insert({ name: trimmed, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['esign-document-types'] });
      toast.success('Type added');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to add type'),
  });
}

export function useUpdateDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string; oldName?: string }) => {
      const trimmed = input.name.trim();
      if (!trimmed) throw new Error('Name required');
      const { error } = await supabase
        .from('esign_document_types' as any)
        .update({ name: trimmed })
        .eq('id', input.id);
      if (error) throw error;
      // Cascade-rename existing references so filters keep working.
      if (input.oldName && input.oldName !== trimmed) {
        await supabase.from('esign_envelopes').update({ document_type: trimmed }).eq('document_type', input.oldName);
        await supabase.from('esign_templates').update({ document_type: trimmed }).eq('document_type', input.oldName);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['esign-document-types'] });
      qc.invalidateQueries({ queryKey: ['esign-envelopes'] });
      qc.invalidateQueries({ queryKey: ['esign-templates'] });
      toast.success('Type updated');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to update type'),
  });
}

export function useDeleteDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      // Untag any envelopes/templates that referenced this type.
      await supabase.from('esign_envelopes').update({ document_type: null }).eq('document_type', input.name);
      await supabase.from('esign_templates').update({ document_type: null }).eq('document_type', input.name);
      const { error } = await supabase.from('esign_document_types' as any).delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['esign-document-types'] });
      qc.invalidateQueries({ queryKey: ['esign-envelopes'] });
      qc.invalidateQueries({ queryKey: ['esign-templates'] });
      toast.success('Type deleted');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete type'),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string | null; document_type?: string | null }) => {
      const updates: any = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.document_type !== undefined) updates.document_type = input.document_type;
      const { error } = await supabase.from('esign_templates').update(updates).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['esign-templates'] });
      toast.success('Template updated');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to update template'),
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

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('esign_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['esign-templates'] });
      toast.success('Template deleted');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete template'),
  });
}

export function useSaveEnvelopeAsTemplate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      envelopeId: string;
      name: string;
      description?: string;
      document_type?: string;
    }) => {
      // Pull envelope + fields
      const [envRes, fieldsRes] = await Promise.all([
        supabase.from('esign_envelopes').select('*').eq('id', input.envelopeId).single(),
        supabase.from('esign_fields').select('*').eq('envelope_id', input.envelopeId),
      ]);
      if (envRes.error) throw envRes.error;
      if (fieldsRes.error) throw fieldsRes.error;
      const env = envRes.data;
      // Strip signer-specific & envelope-specific data from fields
      const default_fields = (fieldsRes.data || []).map((f: any) => ({
        field_type: f.field_type,
        page_number: f.page_number,
        x_pct: f.x_pct,
        y_pct: f.y_pct,
        width_pct: f.width_pct,
        height_pct: f.height_pct,
        required: f.required,
      }));
      const { data, error } = await supabase.from('esign_templates').insert({
        created_by: user?.id,
        name: input.name,
        description: input.description || null,
        document_type: input.document_type || env.document_type || null,
        source_pdf_path: env.original_pdf_path,
        default_fields,
        is_system: false,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['esign-templates'] });
      toast.success('Saved as template');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save template'),
  });
}