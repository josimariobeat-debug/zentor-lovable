import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Video, Mic, FolderOpen, Upload, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/toaster';
import {
  getUploadSessionByToken,
  createSessionUploadUrl,
  registerSessionUpload,
  getSessionStatus,
} from '@/lib/uploadSessions.functions';

interface UploadSession {
  id: string;
  user_id: string;
  expires_at: string;
}



interface FilePreview {
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  progress: number;
}

export default function MobileUpload() {
  const { token } = useParams();
  const [session, setSession] = useState<UploadSession | null>(null);
  const [status, setStatus] = useState<'loading' | 'active' | 'expired' | 'closed' | 'error'>('loading');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Carregar sessão
  useEffect(() => {
    loadSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Poll session status (substitui realtime)
  useEffect(() => {
    if (!session || !token) return;
    const interval = setInterval(async () => {
      try {
        const res = await getSessionStatus({ data: { token } });
        if (res.status !== 'active') setStatus(res.status);
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [session, token]);

  const loadSession = async () => {
    if (!token) {
      setStatus('error');
      return;
    }

    try {
      const res = await getUploadSessionByToken({ data: { token } });
      if (res.status !== 'active' || !res.session) {
        setStatus(res.status);
        return;
      }
      setSession(res.session);
      setStatus('active');
    } catch (err) {
      console.error('Erro ao carregar sessão:', err);
      setStatus('error');
    }

  };

  // Adicionar arquivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: FilePreview[] = Array.from(selectedFiles).slice(0, 10).map((file) => {
      // Detectar tipo de arquivo (incluindo HEVC)
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/') || 
                      file.type === 'video/hevc' || 
                      file.type === 'video/x-hevc' ||
                      file.name.toLowerCase().endsWith('.hevc') ||
                      file.name.toLowerCase().endsWith('.mov');
      
      return {
        file,
        preview: isImage ? URL.createObjectURL(file) : (isVideo ? URL.createObjectURL(file) : ''),
        uploading: false,
        uploaded: false,
        progress: 0
      };
    });

    setFiles((prev) => [...prev, ...newFiles].slice(0, 10));
    e.target.value = '';
  };

  // Remover arquivo
  const removeFile = (index: number) => {
    setFiles((prev) => {
      const file = prev[index];
      if (file.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Upload de todos os arquivos
  const uploadFiles = async () => {
    if (!supabase || !session || !token || files.length === 0) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];
      if (fileItem.uploaded) continue;

      setFiles((prev) => prev.map((f, idx) =>
        idx === i ? { ...f, uploading: true } : f
      ));

      try {
        // 0) Compressão automática preservando qualidade (imagens). Vídeos passam direto.
        const { compressMedia } = await import('@/lib/mediaCompression');
        const optimized = await compressMedia(fileItem.file);

        // 1) Mint signed upload URL via server fn (validates session token)
        const signed = await createSessionUploadUrl({
          data: { token, fileName: optimized.name },
        });

        // 2) Upload directly to storage using signed token (no anon RLS needed)
        const { error: uploadError } = await supabase.storage
          .from('media')
          .uploadToSignedUrl(signed.path, signed.token, optimized);
        if (uploadError) throw uploadError;

        // 3) Register file row + get long-lived signed read URL via server fn
        await registerSessionUpload({
          data: {
            token,
            path: signed.path,
            fileName: optimized.name,
            mimeType: optimized.type,
            size: optimized.size,
          },
        });

        setFiles((prev) => prev.map((f, idx) =>
          idx === i ? { ...f, uploading: false, uploaded: true, progress: 100 } : f
        ));
      } catch (err) {
        console.error('Erro ao fazer upload:', err);
        setFiles((prev) => prev.map((f, idx) =>
          idx === i ? { ...f, uploading: false } : f
        ));
        toast.error(`Erro ao enviar ${fileItem.file.name}`);
      }
    }

    setUploading(false);
    toast.success('Upload concluído!');
  };


  // Formatar tamanho
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Tela de erro/expiração
  if (status === 'loading') {
    return (
      <div data-ev-id="ev_4d04018f9d" className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div data-ev-id="ev_9dedb0e8e3" className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-neutral-400 mx-auto mb-4" />
          <p data-ev-id="ev_3d3041b215" className="text-neutral-600">Carregando...</p>
        </div>
      </div>);

  }

  if (status === 'expired') {
    return (
      <div data-ev-id="ev_e1561f6273" className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div data-ev-id="ev_76550d98ac" className="text-center max-w-xs">
          <div data-ev-id="ev_936044fba7" className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 data-ev-id="ev_f4f66f9374" className="text-xl font-semibold text-neutral-900 mb-2">Sessão Expirada</h1>
          <p data-ev-id="ev_d319dfeed0" className="text-neutral-500 text-sm">
            Esta sessão de upload expirou. Gere um novo QR Code no computador.
          </p>
        </div>
      </div>);

  }

  if (status === 'closed') {
    return (
      <div data-ev-id="ev_9dbcd8200f" className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div data-ev-id="ev_6e954a6fbc" className="text-center max-w-xs">
          <div data-ev-id="ev_df0c64352c" className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-neutral-500" />
          </div>
          <h1 data-ev-id="ev_b6dae7fb9e" className="text-xl font-semibold text-neutral-900 mb-2">Sessão Encerrada</h1>
          <p data-ev-id="ev_e9b7dcc451" className="text-neutral-500 text-sm">
            A sessão foi encerrada no computador. Gere um novo QR Code para continuar.
          </p>
        </div>
      </div>);

  }

  if (status === 'error') {
    return (
      <div data-ev-id="ev_7b755bf266" className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div data-ev-id="ev_184451c4a8" className="text-center max-w-xs">
          <div data-ev-id="ev_f77cbf6f95" className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 data-ev-id="ev_06f8f35ccb" className="text-xl font-semibold text-neutral-900 mb-2">Sessão Inválida</h1>
          <p data-ev-id="ev_b5b08eb3cc" className="text-neutral-500 text-sm">
            Esta sessão de upload não existe ou já foi utilizada.
          </p>
        </div>
      </div>);

  }

  return (
    <div data-ev-id="ev_717eeac78d" className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <header data-ev-id="ev_63b0819120" className="bg-white border-b border-neutral-200 px-4 py-4">
        <div data-ev-id="ev_1008a1ef55" className="flex items-center justify-center gap-2">
          <div data-ev-id="ev_e1ba73d55a" className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h1 data-ev-id="ev_46d90c6e1b" className="text-lg font-semibold text-neutral-900">Enviar Arquivos</h1>
        </div>
        <p data-ev-id="ev_e00901b02b" className="text-center text-sm text-neutral-500 mt-1">
          Conectado ao seu computador
        </p>
      </header>

      {/* Botões de captura */}
      <div data-ev-id="ev_5d690cf50a" className="p-4">
        <div data-ev-id="ev_e010247451" className="grid grid-cols-2 gap-3">
          {/* Tirar foto */}
          <input data-ev-id="ev_bc1dc98eeb"
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect} />

          <button data-ev-id="ev_10dd3938e3"
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-col items-center gap-2 bg-white border border-neutral-200 rounded-2xl p-5 hover:bg-neutral-50 active:bg-neutral-100 transition-colors">

            <div data-ev-id="ev_64ff08e191" className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <span data-ev-id="ev_136dcc4d03" className="text-sm font-medium text-neutral-700">Tirar Foto</span>
          </button>

          {/* Gravar vídeo */}
          <input data-ev-id="ev_9cced8806f"
          ref={videoInputRef}
          type="file"
          accept="video/*,video/hevc,video/x-hevc,.hevc,.mov,.mp4"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect} />

          <button data-ev-id="ev_89facb0757"
          onClick={() => videoInputRef.current?.click()}
          className="flex flex-col items-center gap-2 bg-white border border-neutral-200 rounded-2xl p-5 hover:bg-neutral-50 active:bg-neutral-100 transition-colors">

            <div data-ev-id="ev_6b13080a05" className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Video className="w-6 h-6 text-red-600" />
            </div>
            <span data-ev-id="ev_94e2ba7174" className="text-sm font-medium text-neutral-700">Gravar Vídeo</span>
          </button>

          {/* Selecionar arquivos */}
          <input data-ev-id="ev_b4addf871d"
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,video/hevc,video/x-hevc,.hevc,.mov,.mp4,audio/*,.pdf,.doc,.docx"
          multiple
          className="hidden"
          onChange={handleFileSelect} />

          <button data-ev-id="ev_5bc59ff5b4"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-2 bg-white border border-neutral-200 rounded-2xl p-5 hover:bg-neutral-50 active:bg-neutral-100 transition-colors col-span-2">

            <div data-ev-id="ev_4b7bcfb14b" className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-purple-600" />
            </div>
            <span data-ev-id="ev_d1230bee9f" className="text-sm font-medium text-neutral-700">Selecionar Arquivos</span>
            <span data-ev-id="ev_cb9b082457" className="text-xs text-neutral-400">Fotos, vídeos, áudios, PDFs</span>
          </button>
        </div>
      </div>

      {/* Lista de arquivos */}
      {files.length > 0 &&
      <div data-ev-id="ev_6d6b5dd873" className="flex-1 p-4 pt-0">
          <p data-ev-id="ev_5842105840" className="text-sm font-medium text-neutral-700 mb-3">
            Arquivos selecionados ({files.length}/10)
          </p>
          <div data-ev-id="ev_bae692c1af" className="flex flex-col gap-2">
            {files.map((item, index) =>
          <div data-ev-id="ev_fea0195df5"
          key={index}
          className={`flex items-center gap-3 bg-white border rounded-xl p-3 ${
          item.uploaded ? 'border-green-200 bg-green-50' : 'border-neutral-200'}`
          }>

                {/* Preview */}
                {item.preview ?
            <img data-ev-id="ev_edef53edce"
            src={item.preview}
            alt=""
            className="w-12 h-12 rounded-lg object-cover" /> :


            <div data-ev-id="ev_59feb2ed02" className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-neutral-400" />
                  </div>
            }

                {/* Info */}
                <div data-ev-id="ev_25fa36a72d" className="flex-1 min-w-0">
                  <p data-ev-id="ev_f12557f897" className="text-sm font-medium text-neutral-900 truncate">
                    {item.file.name}
                  </p>
                  <p data-ev-id="ev_5ff54b6432" className="text-xs text-neutral-500">
                    {formatSize(item.file.size)}
                  </p>
                </div>

                {/* Status */}
                {item.uploading ?
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" /> :
            item.uploaded ?
            <div data-ev-id="ev_0218977a39" className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div> :

            <button data-ev-id="ev_c4681af6ad"
            onClick={() => removeFile(index)}
            className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center">

                    <X className="w-4 h-4 text-neutral-500" />
                  </button>
            }
              </div>
          )}
          </div>
        </div>
      }

      {/* Botão de enviar */}
      {files.length > 0 &&
      <div data-ev-id="ev_9cf42fa436" className="p-4 bg-white border-t border-neutral-200">
          <button data-ev-id="ev_77e8e3b82e"
        onClick={uploadFiles}
        disabled={uploading || files.every((f) => f.uploaded)}
        className="w-full h-12 bg-neutral-900 text-white font-medium rounded-xl hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">

            {uploading ?
          <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </> :
          files.every((f) => f.uploaded) ?
          <>
                <Check className="w-5 h-5" />
                Todos enviados!
              </> :

          <>
                <Upload className="w-5 h-5" />
                Enviar {files.filter((f) => !f.uploaded).length} arquivo{files.filter((f) => !f.uploaded).length > 1 ? 's' : ''}
              </>
          }
          </button>
        </div>
      }
    </div>);

}