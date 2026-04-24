import { Button } from '@/components/ui/button';
import { PenLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  source: 'proposal' | 'change_order' | 'subcontractor' | 'invoice';
  sourceId?: string;
  projectId?: string;
  title?: string;
  variant?: 'ghost' | 'outline' | 'default';
  size?: 'sm' | 'icon' | 'default';
  iconOnly?: boolean;
}

export function SendForSignatureButton({
  source, sourceId, projectId, title, variant = 'ghost', size = 'sm', iconOnly = false,
}: Props) {
  const navigate = useNavigate();
  const handle = () => {
    const params = new URLSearchParams();
    params.set('source', source);
    if (sourceId) params.set('sourceId', sourceId);
    if (projectId) params.set('projectId', projectId);
    if (title) params.set('title', title);
    navigate(`/esign/new?${params.toString()}`);
  };
  return (
    <Button variant={variant} size={size} onClick={handle} title="Send for signature">
      <PenLine className={iconOnly ? 'h-4 w-4' : 'h-4 w-4 mr-2'} />
      {!iconOnly && 'Send for Signature'}
    </Button>
  );
}