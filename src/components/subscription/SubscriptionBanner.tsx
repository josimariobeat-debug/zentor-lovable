import { useNavigate } from 'react-router';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';

export default function SubscriptionBanner() {
  const navigate = useNavigate();
  const { subscription, hasActiveSubscription, daysRemaining } = useSubscription();

  // Não mostrar se não há assinatura ou se está ativa com mais de 7 dias
  if (!subscription) return null;
  if (hasActiveSubscription && daysRemaining > 7) return null;

  const isExpired = subscription.status === 'expired' || !hasActiveSubscription;
  const isExpiring = hasActiveSubscription && daysRemaining <= 7;

  if (!isExpired && !isExpiring) return null;

  return (
    <div data-ev-id="ev_1e9393efa0"
    className={`px-4 py-3 flex items-center justify-between ${
    isExpired ?
    'bg-red-50 border-b border-red-100' :
    'bg-amber-50 border-b border-amber-100'}`
    }>

      <div data-ev-id="ev_1479d3c6c5" className="flex items-center gap-3">
        {isExpired ?
        <AlertTriangle className="w-5 h-5 text-red-500" /> :

        <Clock className="w-5 h-5 text-amber-500" />
        }
        <p data-ev-id="ev_646c222b54" className={`text-[13px] font-medium ${
        isExpired ? 'text-red-700' : 'text-amber-700'}`
        }>
          {isExpired ?
          'Sua assinatura expirou. Renove para continuar usando os aplicativos.' :
          `Sua assinatura expira em ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}. Renove para não perder o acesso.`
          }
        </p>
      </div>
      <button data-ev-id="ev_8bcf8f64c0"
      onClick={() => navigate('/assinaturas')}
      className={`px-4 py-2 text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors ${
      isExpired ?
      'bg-red-600 text-white hover:bg-red-700' :
      'bg-amber-600 text-white hover:bg-amber-700'}`
      }>

        {isExpired ? 'Renovar agora' : 'Renovar'}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>);

}