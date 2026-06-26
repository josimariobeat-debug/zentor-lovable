import { useState, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import { Play, Check, Search, Star, MessageSquare, Zap, ShoppingBag, Loader2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import PaymentModal from '@/components/subscription/PaymentModal';
import type { Tables } from '@/integrations/supabase/helpers';
import { StoreCardSkeleton } from '@/components/ui/skeleton';

type InstalledApp = Tables<'installed_apps'>;

interface StoreApp {
  id: string;
  name: string;
  type: string;
  description: string;
  price: number;
  priceDisplay: string;
  icon: React.ComponentType<{className?: string;}>;
}

// Catálogo de apps disponíveis
const APP_CATALOG: StoreApp[] = [
{
  id: 'stories-videos',
  name: 'Stories Vídeos',
  type: 'SCRIPT EXTERNO',
  description: 'Crie e gerencie stories e vídeos com player flutuante e carrossel na sua loja.',
  price: 29.90,
  priceDisplay: 'R$ 29,90/mês',
  icon: Play
},
{
  id: 'avaliacoes-pro',
  name: 'Avaliações Pro',
  type: 'SCRIPT EXTERNO',
  description: 'Colete e exiba avaliações verificadas dos seus clientes com fotos e vídeos.',
  price: 19.90,
  priceDisplay: 'R$ 19,90/mês',
  icon: Star
},
{
  id: 'popup-conversao',
  name: 'Pop-up de Conversão',
  type: 'SCRIPT EXTERNO',
  description: 'Pop-ups inteligentes baseados em comportamento para aumentar conversão.',
  price: 14.90,
  priceDisplay: 'R$ 14,90/mês',
  icon: Zap
},
{
  id: 'whatsapp-button',
  name: 'WhatsApp Button',
  type: 'SCRIPT EXTERNO',
  description: 'Botão flutuante de WhatsApp com mensagens personalizadas por página.',
  price: 0,
  priceDisplay: 'Grátis',
  icon: MessageSquare
}];


export default function LojaApps() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [userApps, setUserApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingApp, setProcessingApp] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<StoreApp | null>(null);

  useEffect(() => {
    loadUserApps();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadUserApps = async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.
    from('installed_apps').
    select('*').
    eq('user_id', user.id);
    setUserApps(data ?? []);
    setLoading(false);
  };

  // Encontrar assinatura do usuário para um app
  const getUserAppData = (appId: string): InstalledApp | undefined => {
    return userApps.find((a) => a.app_id === appId);
  };

  // Verificar status do app
  const getAppStatus = (appId: string): 'not_subscribed' | 'active' | 'expired' | 'installed' | 'not_installed' => {
    const userApp = getUserAppData(appId);
    if (!userApp) return 'not_subscribed';

    const isExpired = userApp.expires_at && new Date(userApp.expires_at) < new Date();
    if (isExpired) return 'expired';

    if (userApp.is_installed) return 'installed';
    return 'not_installed'; // Tem assinatura ativa mas não está instalado
  };

  // Assinar app
  const handleSubscribe = (app: StoreApp) => {
    setSelectedApp(app);
    setPaymentOpen(true);
  };

  // Processar assinatura após pagamento
  const processSubscription = async () => {
    if (!supabase || !user || !selectedApp) return;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const existingApp = getUserAppData(selectedApp.id);

    if (existingApp) {
      // Renovar assinatura
      await supabase.
      from('installed_apps').
      update({
        status: 'active',
        is_installed: true,
        expires_at: expiresAt.toISOString()
      }).
      eq('id', existingApp.id);
    } else {
      // Nova assinatura
      await supabase.from('installed_apps').insert({
        user_id: user.id,
        app_id: selectedApp.id,
        name: selectedApp.name,
        type: selectedApp.id === 'stories-videos' ? 'stories' : selectedApp.id,
        description: selectedApp.description,
        status: 'active',
        is_installed: true,
        expires_at: expiresAt.toISOString()
      });
    }

    // Registrar pagamento
    await supabase.from('payments').insert({
      user_id: user.id,
      amount: selectedApp.price,
      status: 'completed',
      payment_method: 'simulated',
      paid_at: now.toISOString()
    });

    await loadUserApps();
    setSelectedApp(null);
  };

  // Instalar app (já tem assinatura)
  const handleInstall = async (appId: string) => {
    if (!supabase || !user) return;

    setProcessingApp(appId);

    const userApp = getUserAppData(appId);
    if (userApp) {
      await supabase.
      from('installed_apps').
      update({ is_installed: true }).
      eq('id', userApp.id);

      toast.success('App instalado com sucesso!');
      await loadUserApps();
    }

    setProcessingApp(null);
  };

  const filtered = APP_CATALOG.filter(
    (a) =>
    a.name.toLowerCase().includes(query.toLowerCase()) ||
    a.description.toLowerCase().includes(query.toLowerCase())
  );

  const renderAppButton = (app: StoreApp) => {
    const status = getAppStatus(app.id);
    const userApp = getUserAppData(app.id);
    const isProcessing = processingApp === app.id;

    switch (status) {
      case 'installed':
        return (
          <span data-ev-id="ev_9a01ac6d75" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
            <Check className="w-3.5 h-3.5" /> Instalado
          </span>);


      case 'not_installed':
        return (
          <button data-ev-id="ev_95e9a1e4a0"
          onClick={() => handleInstall(app.id)}
          disabled={isProcessing}
          className="text-[13px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">

            {isProcessing ?
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Instalando...</> :

            'Instalar'
            }
          </button>);


      case 'expired':
        return (
          <button data-ev-id="ev_8c087008f8"
          onClick={() => handleSubscribe(app)}
          className="text-[13px] font-medium text-white bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">

            <RefreshCw className="w-3.5 h-3.5" /> Renovar
          </button>);


      default:
        return (
          <button data-ev-id="ev_12a5396977"
          onClick={() => handleSubscribe(app)}
          className="text-[13px] font-medium text-white bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg transition-colors">

            Assinar
          </button>);

    }
  };

  const renderAppStatus = (app: StoreApp) => {
    const status = getAppStatus(app.id);
    const userApp = getUserAppData(app.id);

    if (status === 'expired') {
      return (
        <span data-ev-id="ev_c4d0dc4b05" className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
          Expirado
        </span>);

    }

    if (status === 'installed' && userApp?.expires_at) {
      const daysLeft = Math.ceil(
        (new Date(userApp.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return (
        <span data-ev-id="ev_b7175bb84c" className="text-[11px] font-medium text-neutral-500">
          Expira em {daysLeft} dias
        </span>);

    }

    return null;
  };

  return (
    <>
      <TopBar title="Loja de Apps" />
      <main data-ev-id="ev_ff2a750196" className="px-10 py-10 fade-in">
        <div data-ev-id="ev_925dfd90bf" className="flex items-center justify-between mb-8">
          <div data-ev-id="ev_1287b6842e">
            <h2 data-ev-id="ev_fd7d98ed6c" className="text-[18px] font-semibold text-neutral-900">Explore nossos apps</h2>
            <p data-ev-id="ev_fb47e0fff6" className="text-[14px] text-neutral-500 mt-1">
              Escolha os apps que vão transformar seu e-commerce
            </p>
          </div>
          <div data-ev-id="ev_3bac944e27" className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar apps..."
              className="pl-9 h-10 rounded-xl border-neutral-200" />

          </div>
        </div>

        {loading ?
        <StoreCardSkeleton count={3} /> :

        <div data-ev-id="ev_3a42082e84" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((app) => {
            const AppIcon = app.icon;
            return (
              <div data-ev-id="ev_e3aa572043"
              key={app.id}
              className="bg-white border border-neutral-200 rounded-2xl p-5 hover:border-neutral-300 hover:shadow-[0_4px_24px_-12px_rgba(0,0,0,0.1)] transition-all">

                  <div data-ev-id="ev_f4b0a17ab8" className="flex items-start gap-4 mb-4">
                    <div data-ev-id="ev_a853848759" className="w-16 h-16 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
                      <AppIcon className="w-6 h-6" />
                    </div>
                    <div data-ev-id="ev_153e086b13" className="flex-1">
                      <div data-ev-id="ev_3f8e103aae" className="flex items-center gap-2">
                        <h3 data-ev-id="ev_cbb1a5c7d4" className="text-[16px] font-semibold text-neutral-900">{app.name}</h3>
                        {renderAppStatus(app)}
                      </div>
                      <span data-ev-id="ev_66450b3c0f" className="inline-block mt-1 text-[10px] font-semibold tracking-wider uppercase bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">
                        {app.type}
                      </span>
                    </div>
                  </div>
                  <p data-ev-id="ev_dec95ae934" className="text-[13.5px] text-neutral-600 mb-5 leading-relaxed min-h-[44px]">
                    {app.description}
                  </p>
                  <div data-ev-id="ev_171954bba7" className="flex items-center justify-between pt-4 border-t border-neutral-100">
                    <span data-ev-id="ev_dcb16cc431" className="text-[14px] font-semibold text-neutral-900">
                      {app.priceDisplay}
                    </span>
                    {renderAppButton(app)}
                  </div>
                </div>);

          })}
          </div>
        }
      </main>

      {/* Payment Modal */}
      {selectedApp &&
      <PaymentModal
        open={paymentOpen}
        onOpenChange={(open) => {
          setPaymentOpen(open);
          if (!open) setSelectedApp(null);
        }}
        isRenewal={getAppStatus(selectedApp.id) === 'expired'}
        appName={selectedApp.name}
        appPrice={selectedApp.price}
        onSuccess={processSubscription} />

      }
    </>);

}