import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import TopBar from '@/components/layout/TopBar';
import { CreditCard, Calendar, Sparkles, Check, AlertTriangle, Clock, Receipt, Play, Star, Zap, MessageSquare, RefreshCw, ShoppingBag } from 'lucide-react';
import PaymentModal from '@/components/subscription/PaymentModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { PaymentHistorySkeleton, SubscriptionSummarySkeleton, SubscriptionTableSkeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/integrations/supabase/helpers';

type InstalledApp = Tables<'installed_apps'>;
type Payment = Tables<'payments'>;

// Ícones dos apps
const APP_ICONS: Record<string, React.ComponentType<{className?: string;}>> = {
  'stories-videos': Play,
  'avaliacoes-pro': Star,
  'popup-conversao': Zap,
  'whatsapp-button': MessageSquare
};

export default function Assinaturas() {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(null);

  const loadData = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false);
      setLoadingPayments(false);
      return;
    }

    setLoading(true);
    setLoadingPayments(true);

    const [appsResult, paymentsResult] = await Promise.all([
      supabase.
      from('installed_apps').
      select('*').
      eq('user_id', userId).
      order('created_at', { ascending: false }),
      supabase.
      from('payments').
      select('*').
      eq('user_id', userId).
      order('created_at', { ascending: false }).
      limit(10)
    ]);

    const { data: appsData } = appsResult;
    const { data: paymentsData } = paymentsResult;
    setApps(appsData ?? []);
    setPayments(paymentsData ?? []);
    setLoading(false);
    setLoadingPayments(false);
  }, [userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleRenew = useCallback((app: InstalledApp) => {
    setSelectedApp(app);
    setPaymentOpen(true);
  }, []);

  const processRenewal = useCallback(async () => {
    if (!supabase || !userId || !selectedApp) return;
    const { renewInstalledApp } = await import('@/lib/subscriptions.functions');
    await renewInstalledApp({ data: { installedAppId: selectedApp.id, price: 29.9 } });
    await loadData();
    setSelectedApp(null);
  }, [loadData, selectedApp, userId]);


  const getAppIcon = useCallback((appId: string | null) => {
    const Icon = APP_ICONS[appId || ''] || Sparkles;
    return <Icon className="w-4 h-4" />;
  }, []);

  const { expiredApps, totalActive, totalPaid } = useMemo(() => {
    const expired = apps.filter((app) => isExpired(app.expires_at));
    return {
      expiredApps: expired,
      totalActive: apps.length - expired.length,
      totalPaid: payments.reduce((acc, p) => acc + (p.amount || 0), 0),
    };
  }, [apps, payments]);

  return (
    <>
      <TopBar title="Assinaturas" />
      <main data-ev-id="ev_da64a0eaaa" className="px-10 py-10 fade-in">
        <p data-ev-id="ev_4c5ac762cc" className="text-[14px] text-neutral-500 mb-8 max-w-2xl">
          Gerencie suas assinaturas de apps e tenha acesso completo aos recursos.
        </p>

        {/* Resumo */}
        {loading ?
        <SubscriptionSummarySkeleton /> :
        <div data-ev-id="ev_0375aa2a65" className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mb-6">
          <div data-ev-id="ev_720c95eb85" className="bg-white border border-neutral-200 rounded-2xl p-5 min-h-[88px]">
            <div data-ev-id="ev_e87104da47" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_f476e9ebf4" className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <div data-ev-id="ev_f96e3f4237">
                <p data-ev-id="ev_2891545c09" className="text-[12px] text-neutral-500 uppercase tracking-wider font-medium">Apps Ativos</p>
                <p data-ev-id="ev_55701217c7" className="text-[24px] font-bold text-neutral-900">{totalActive}</p>
              </div>
            </div>
          </div>
          <div data-ev-id="ev_f7cb9e044e" className="bg-white border border-neutral-200 rounded-2xl p-5 min-h-[88px]">
            <div data-ev-id="ev_03159c0ed4" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_314cef8bb0" className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div data-ev-id="ev_410e25df11">
                <p data-ev-id="ev_0a94525b5e" className="text-[12px] text-neutral-500 uppercase tracking-wider font-medium">Expirados</p>
                <p data-ev-id="ev_b232e17018" className="text-[24px] font-bold text-neutral-900">{expiredApps.length}</p>
              </div>
            </div>
          </div>
          <div data-ev-id="ev_ad305e08fa" className="bg-white border border-neutral-200 rounded-2xl p-5 min-h-[88px]">
            <div data-ev-id="ev_055b3a63a5" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_540a07ced8" className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-violet-600" />
              </div>
              <div data-ev-id="ev_de0f547c1a">
                <p data-ev-id="ev_c6f4c4d671" className="text-[12px] text-neutral-500 uppercase tracking-wider font-medium">Total Pago</p>
                <p data-ev-id="ev_c24632beb0" className="text-[24px] font-bold text-neutral-900">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
            </div>
          </div>
        </div>
        }

        {/* Lista de Assinaturas */}
        <div data-ev-id="ev_b29c80900c" className="bg-white border border-neutral-200 rounded-2xl overflow-hidden max-w-4xl mb-6">
          <div data-ev-id="ev_504f24d195" className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div data-ev-id="ev_4b2a2e7dd7" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <h3 data-ev-id="ev_cf8628f4de" className="text-[15px] font-semibold text-neutral-900">Suas Assinaturas</h3>
            </div>
            <button data-ev-id="ev_cab25d632f"
            onClick={() => navigate('/loja')}
            className="text-[13px] font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1.5">

              <ShoppingBag className="w-4 h-4" />
              Ver mais apps
            </button>
          </div>

          {loading ?
          <SubscriptionTableSkeleton rows={1} /> :
          apps.length === 0 ?
          <div data-ev-id="ev_5344b20d7a" className="p-10 text-center">
              <div data-ev-id="ev_37783d8bc6" className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-violet-600" />
              </div>
              <h3 data-ev-id="ev_1b66ea906e" className="text-lg font-semibold text-neutral-900 mb-2">
                Nenhuma assinatura ainda
              </h3>
              <p data-ev-id="ev_ad79fc5691" className="text-[14px] text-neutral-500 mb-6 max-w-md mx-auto">
                Visite a loja de apps para escolher ferramentas incríveis para sua loja.
              </p>
              <button data-ev-id="ev_5740f9084c"
            onClick={() => navigate('/loja')}
            className="px-6 py-3 bg-violet-600 text-white text-[14px] font-semibold rounded-xl hover:bg-violet-700 transition-colors inline-flex items-center gap-2">

                <ShoppingBag className="w-4 h-4" />
                Explorar apps
              </button>
            </div> :

          <>
              {/* Header da tabela */}
              <div data-ev-id="ev_d5793e44a0" className="grid grid-cols-12 px-6 py-3 bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold tracking-wider uppercase text-neutral-500 min-h-[40px]">
                <div data-ev-id="ev_694a2b7e01" className="col-span-4">App</div>
                <div data-ev-id="ev_ac971f8391" className="col-span-2">Início</div>
                <div data-ev-id="ev_83ae804068" className="col-span-2">Vencimento</div>
                <div data-ev-id="ev_fcf19c40fa" className="col-span-2">Dias restantes</div>
                <div data-ev-id="ev_e0d16c87ff" className="col-span-2 text-right">Status</div>
              </div>

              {/* Lista de apps */}
              <div data-ev-id="ev_d4ffd0afed" className="divide-y divide-neutral-100">
                {apps.map((app) => {
                const expired = isExpired(app.expires_at);
                const daysLeft = getDaysRemaining(app.expires_at);

                return (
                  <div data-ev-id="ev_878bf8e38e" key={app.id} className="grid grid-cols-12 px-6 py-4 items-center text-[14px] min-h-[70px]">
                      <div data-ev-id="ev_42b7e3cd5f" className="col-span-4 font-medium text-neutral-900 flex items-center gap-3">
                        <div data-ev-id="ev_d7547da844" className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                          {getAppIcon(app.app_id)}
                        </div>
                        <div data-ev-id="ev_dd6dbe3325">
                          <p data-ev-id="ev_88d951738a" className="font-medium">{app.name}</p>
                          <p data-ev-id="ev_64907c46aa" className="text-[11px] text-neutral-500 uppercase tracking-wider">{app.type}</p>
                        </div>
                      </div>
                      <div data-ev-id="ev_32075bb81a" className="col-span-2 text-neutral-600 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        {formatDate(app.created_at)}
                      </div>
                      <div data-ev-id="ev_0d4006f949" className="col-span-2 text-neutral-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                        {formatDate(app.expires_at)}
                      </div>
                      <div data-ev-id="ev_4b97f04bfd" className="col-span-2">
                        {expired ?
                      <span data-ev-id="ev_4eec833337" className="text-amber-600 font-medium">Expirado</span> :

                      <span data-ev-id="ev_8f945d7248" className="text-neutral-900 font-medium">{daysLeft} dias</span>
                      }
                      </div>
                      <div data-ev-id="ev_dfebb5c6a1" className="col-span-2 text-right">
                        {expired ?
                      <button data-ev-id="ev_2639e0e3c8"
                      onClick={() => handleRenew(app)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-[12px] font-semibold rounded-lg hover:bg-amber-700 transition-colors">

                            <RefreshCw className="w-3.5 h-3.5" />
                            Renovar
                          </button> :

                      <span data-ev-id="ev_9a5e25bfdc" className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md">
                            <Check className="w-3 h-3" />
                            Ativa
                          </span>
                      }
                      </div>
                    </div>);

              })}
              </div>
            </>
          }
        </div>

        {/* Histórico de Pagamentos */}
        <div data-ev-id="ev_4bbcac0627" className="bg-white border border-neutral-200 rounded-2xl overflow-hidden max-w-4xl">
          <div data-ev-id="ev_746c7a3859" className="px-6 py-4 border-b border-neutral-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-neutral-500" />
            <h3 data-ev-id="ev_03f76f5813" className="text-[15px] font-semibold text-neutral-900">Histórico de pagamentos</h3>
          </div>
          {loadingPayments ?
          <PaymentHistorySkeleton /> :
          payments.length === 0 ?
            <div data-ev-id="ev_21ab134bb8" className="p-10 min-h-[100px] text-center text-[14px] text-neutral-500">
              Nenhum pagamento realizado ainda.
            </div> :

          <div data-ev-id="ev_2dd3781ccd" className="divide-y divide-neutral-100">
              {payments.map((payment) =>
            <div data-ev-id="ev_f3a360a0ee" key={payment.id} className="px-6 py-4 flex items-center justify-between">
                  <div data-ev-id="ev_fc04dfef4a" className="flex items-center gap-4">
                    <div data-ev-id="ev_4b777574e2" className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-neutral-500" />
                    </div>
                    <div data-ev-id="ev_836ae947df">
                      <p data-ev-id="ev_9124fbd0c5" className="text-[14px] font-medium text-neutral-900">Assinatura de app</p>
                      <p data-ev-id="ev_e341137f02" className="text-[12px] text-neutral-500">{formatDate(payment.paid_at)}</p>
                    </div>
                  </div>
                  <div data-ev-id="ev_949625a754" className="flex items-center gap-4">
                    <span data-ev-id="ev_eeea5a296b" className="text-[14px] font-semibold text-neutral-900">
                      {formatCurrency(Number(payment.amount))}
                    </span>
                    <span data-ev-id="ev_68d7eaa575" className="text-[11px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">
                      {payment.status === 'completed' ? 'Pago' : payment.status}
                    </span>
                  </div>
                </div>
            )}
            </div>
          }
        </div>
      </main>

      {selectedApp &&
      <PaymentModal
        open={paymentOpen}
        onOpenChange={(open) => {
          setPaymentOpen(open);
          if (!open) setSelectedApp(null);
        }}
        isRenewal={true}
        appName={selectedApp.name}
        appPrice={29.90}
        onSuccess={processRenewal} />

      }
    </>);

}