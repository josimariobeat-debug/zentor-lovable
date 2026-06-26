import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Smartphone, Copy, Check, Loader2, X, Image, Video, FileText } from 'lucide-react';
import { toast } from '@/components/ui/toaster';
import type { Tables } from '@/integrations/supabase/helpers';

type UploadSession = Tables<'upload_sessions'>;
type UploadSessionFile = Tables<'upload_session_files'>;

interface MobileUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appId?: string;
  onFilesUploaded?: (files: UploadSessionFile[]) => void;
}

function generateSecureToken(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export default function MobileUploadModal({
  open,
  onOpenChange,
  appId,
  onFilesUploaded
}: MobileUploadModalProps) {
  const { user } = useAuth();
  const [session, setSession] = useState<UploadSession | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadSessionFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const uploadUrl = session ? `${window.location.origin}/mobile-upload/${session.token}` : '';

  // Criar sessão ao abrir modal
  const createSession = useCallback(async () => {
    if (!supabase || !user) return;

    setLoading(true);
    try {
      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

      const { data, error } = await supabase.
      from('upload_sessions').
      insert({
        token,
        user_id: user.id,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        app_id: appId || null
      }).
      select().
      single();

      if (error) throw error;
      setSession(data);
      setUploadedFiles([]);
    } catch (err) {
      console.error('Erro ao criar sessão:', err);
      toast.error('Erro ao criar sessão de upload');
    } finally {
      setLoading(false);
    }
  }, [user, appId]);

  // Fechar sessão ao fechar modal
  const closeSession = useCallback(async () => {
    if (!supabase || !session) return;

    try {
      await supabase.
      from('upload_sessions').
      update({ status: 'closed' }).
      eq('id', session.id);
    } catch (err) {
      console.error('Erro ao fechar sessão:', err);
    }

    setSession(null);
    setUploadedFiles([]);
  }, [session]);

  // Gerenciar abertura/fechamento
  useEffect(() => {
    if (open && !session) {
      createSession();
    } else if (!open && session) {
      closeSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Timer de expiração
  useEffect(() => {
    if (!session) return;

    const updateTimer = () => {
      const expires = new Date(session.expires_at).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        toast.error('Sessão expirada');
        onOpenChange(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session, onOpenChange]);

  // Escutar novos arquivos via Realtime
  useEffect(() => {
    if (!supabase || !session) return;

    const channel = supabase.
    channel(`upload_files_${session.id}`).
    on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'upload_session_files',
        filter: `session_id=eq.${session.id}`
      },
      (payload) => {
        const newFile = payload.new as UploadSessionFile;
        setUploadedFiles((prev) => [...prev, newFile]);
        toast.success(`Arquivo recebido: ${newFile.file_name}`);
      }
    ).
    subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Copiar link
  const copyLink = () => {
    const textarea = document.createElement('textarea');
    textarea.value = uploadUrl;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Concluir upload
  const handleFinish = () => {
    if (uploadedFiles.length > 0 && onFilesUploaded) {
      onFilesUploaded(uploadedFiles);
    }
    onOpenChange(false);
  };

  // Ícone por tipo de arquivo
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (mimeType.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <span data-ev-id="ev_13d8cac81a" className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Enviar do celular
            </span>
          </DialogTitle>
        </DialogHeader>

        <div data-ev-id="ev_59281add13" className="flex flex-col items-center py-8 px-2">
          {loading ?
          <div data-ev-id="ev_38eae10e73" className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
              <p data-ev-id="ev_294546ed16" className="text-sm text-neutral-500">Gerando QR Code...</p>
            </div> :
          session ?
          <>
              {/* QR Code */}
              <div data-ev-id="ev_dd6ec231ce" className="bg-white p-4 rounded-2xl border border-neutral-200 mb-4">
                <QRCodeSVG
                value={uploadUrl}
                size={200}
                level="M"
                includeMargin={false} />

              </div>

              {/* Timer */}
              <div data-ev-id="ev_66d9be6e72" className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
                <div data-ev-id="ev_d5218fb217" className={`w-2 h-2 rounded-full ${timeLeft > 60 ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
                Expira em {formatTime(timeLeft)}
              </div>

              {/* Instruções */}
              <p data-ev-id="ev_bd054f5451" className="text-center text-sm text-neutral-600 mb-4 max-w-xs">
                Aponte a câmera do seu celular para o QR Code ou copie o link abaixo
              </p>

              {/* Link manual */}
              <div data-ev-id="ev_59759b1e65" className="w-full flex items-center gap-2 bg-neutral-50 rounded-xl p-2 mb-4">
                <code data-ev-id="ev_030b2579be" className="flex-1 text-xs text-neutral-600 truncate px-2">
                  {session.token}
                </code>
                <button data-ev-id="ev_044204602b"
              onClick={copyLink}
              className="shrink-0 w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800 transition-colors">

                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Arquivos recebidos */}
              {uploadedFiles.length > 0 &&
            <div data-ev-id="ev_1ea58294f2" className="w-full border-t border-neutral-200 pt-4 mt-2">
                  <p data-ev-id="ev_783b5130bb" className="text-sm font-medium text-neutral-900 mb-3">
                    Arquivos recebidos ({uploadedFiles.length})
                  </p>
                  <div data-ev-id="ev_798baf1a10" className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {uploadedFiles.map((file) =>
                <div data-ev-id="ev_0adac9ca66" key={file.id} className="flex items-center gap-3 bg-green-50 text-green-800 rounded-lg px-3 py-2">
                        {getFileIcon(file.mime_type)}
                        <span data-ev-id="ev_735ec52e90" className="text-sm truncate flex-1">{file.file_name}</span>
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                )}
                  </div>
                </div>
            }

              {/* Botão concluir */}
              {uploadedFiles.length > 0 &&
            <button data-ev-id="ev_e6063e3142"
            onClick={handleFinish}
            className="w-full mt-4 h-11 bg-neutral-900 text-white font-medium rounded-xl hover:bg-neutral-800 transition-colors">

                  Concluir ({uploadedFiles.length} arquivo{uploadedFiles.length > 1 ? 's' : ''})
                </button>
            }
            </> :

          <div data-ev-id="ev_9161923cbf" className="text-center py-8 text-neutral-500">
              Erro ao criar sessão
            </div>
          }
        </div>
      </DialogContent>
    </Dialog>);

}