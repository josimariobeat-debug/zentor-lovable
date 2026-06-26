import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import TopBar from '@/components/layout/TopBar';
import AppCard from '@/components/apps/AppCard';
import { AppCardRowSkeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';
import WelcomeModal from '@/components/subscription/WelcomeModal';
import { ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/helpers';

type InstalledApp = Tables<'installed_apps'>;

export default function MeusApps() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const { hasSeenOnboarding, loading: subLoading } = useSubscription();
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  const loadApps = useCallback(async () => {
    if (!supabase || !userId) {
      setApps([]);
      return;
    }

    const { data } = await supabase.
    from('installed_apps').
    select('*').
    eq('user_id', userId).
    eq('is_installed', true) // Apenas apps "instalados" em Meus Apps
    .order('created_at', { ascending: false });
    setApps(data ?? []);
  }, [userId]);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  // Mostrar modal de boas-vindas no primeiro acesso
  useEffect(() => {
    if (!subLoading && !hasSeenOnboarding && userId) {
      setWelcomeOpen(true);
    }
  }, [subLoading, hasSeenOnboarding, userId]);

  const handleUninstall = useCallback(async (id: string) => {
    if (!supabase) return;
    // Apenas marca como não instalado, não exclui a assinatura
    await supabase.
    from('installed_apps').
    update({ is_installed: false }).
    eq('id', id);
    setApps((currentApps) => (currentApps ?? []).filter((app) => app.id !== id));
  }, []);

  const getExpiresInDays = (expiresAt: string | null) => {
    if (!expiresAt) return 30;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getAppStatus = (app: InstalledApp) => {
    if (isExpired(app.expires_at)) return 'expired';
    return app.status;
  };

  const renderedApps = useMemo(() => apps ?? [], [apps]);

  return (
    <>
      <TopBar title="Meus Apps" />
      <main data-ev-id="ev_5e165afc9e" className="px-10 py-10 fade-in">
        <h2 data-ev-id="ev_f285ec828f" className="text-[18px] font-semibold text-neutral-900 mb-6">Apps instalados</h2>
        
        <section className="max-w-[920px] min-h-[130px]">
        {subLoading || apps === null ?
        <AppCardRowSkeleton count={1} /> :
        renderedApps.length === 0 ?
        // Sem apps instalados - CTA para ir à loja
        <div data-ev-id="ev_dd148067b4">
            <div data-ev-id="ev_5cb2c15fed" className="border border-dashed border-neutral-300 rounded-2xl p-12 text-center bg-neutral-50">
              <div data-ev-id="ev_76363d1b33" className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-violet-600" />
              </div>
              <h3 data-ev-id="ev_4798d9452b" className="text-lg font-semibold text-neutral-900 mb-2">
                Nenhum app instalado
              </h3>
              <p data-ev-id="ev_31a82e5e10" className="text-[14px] text-neutral-500 mb-6 max-w-md mx-auto">
                Explore nossa loja e escolha os apps que vão impulsionar seu e-commerce.
              </p>
              <button data-ev-id="ev_a3518c461b"
            onClick={() => navigate('/loja')}
            className="px-6 py-3 bg-violet-600 text-white text-[14px] font-semibold rounded-xl hover:bg-violet-700 transition-colors inline-flex items-center gap-2">

                <ShoppingBag className="w-4 h-4" />
                Escolher apps
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div> :

        <div data-ev-id="ev_1111709a7f" className="flex flex-col gap-4">
            {renderedApps.map((app) =>
          <AppCard
            key={app.id}
            app={{
              id: app.id,
              name: app.name,
              type: app.type,
              description: app.description || '',
              status: getAppStatus(app),
              expiresInDays: getExpiresInDays(app.expires_at)
            }}
            onDelete={handleUninstall}
            isExpired={isExpired(app.expires_at)} />

          )}
          </div>
        }
        </section>
      </main>

      <WelcomeModal
        open={welcomeOpen}
        onOpenChange={setWelcomeOpen} />

    </>);

}