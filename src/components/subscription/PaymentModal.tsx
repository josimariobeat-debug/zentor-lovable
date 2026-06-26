import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CreditCard, Check, Loader2, Shield, Calendar, Sparkles } from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { toast } from '@/components/ui/toaster';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRenewal?: boolean;
  appName?: string;
  appPrice?: number;
  onSuccess?: () => Promise<void>;
}

export default function PaymentModal({ 
  open, 
  onOpenChange, 
  isRenewal = false,
  appName,
  appPrice,
  onSuccess
}: PaymentModalProps) {
  const { subscribe, renewSubscription } = useSubscription();
  
  const displayName = appName || 'Plano Mensal';
  const displayPrice = appPrice ?? 29.90;
  const priceFormatted = `R$ ${displayPrice.toFixed(2).replace('.', ',')}`;
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handlePayment = async () => {
    // Validação básica
    if (cardNumber.replace(/\s/g, '').length < 16) {
      toast.error('Número do cartão inválido');
      return;
    }
    if (!cardName.trim()) {
      toast.error('Nome no cartão é obrigatório');
      return;
    }
    if (expiry.length < 5) {
      toast.error('Data de validade inválida');
      return;
    }
    if (cvv.length < 3) {
      toast.error('CVV inválido');
      return;
    }

    setProcessing(true);

    try {
      // Simular processamento
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (onSuccess) {
        await onSuccess();
      } else if (isRenewal) {
        await renewSubscription();
      } else {
        await subscribe();
      }

      setSuccess(true);
      toast.success(isRenewal ? 'Assinatura renovada com sucesso!' : 'Assinatura ativada com sucesso!');

      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setCardNumber('');
        setCardName('');
        setExpiry('');
        setCvv('');
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar pagamento';
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[400px] p-8 text-center">
          <div data-ev-id="ev_d8198d9332" className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 data-ev-id="ev_2c70362a61" className="text-xl font-bold text-neutral-900 mb-2">
            {isRenewal ? 'Renovação concluída!' : 'Pagamento confirmado!'}
          </h2>
          <p data-ev-id="ev_5a6fd225d6" className="text-neutral-600 text-[14px]">
            Sua assinatura está ativa por mais 30 dias.
          </p>
        </DialogContent>
      </Dialog>);

  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] p-0 overflow-hidden border-0 rounded-2xl">
        {/* Header */}
        <div data-ev-id="ev_00470f1fb4" className="bg-gradient-to-r from-neutral-900 to-neutral-800 px-6 py-5 text-white">
          <div data-ev-id="ev_ef5306b0ee" className="flex items-center gap-3">
            <div data-ev-id="ev_e7aef6b8cc" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div data-ev-id="ev_26b3aef55b">
              <h2 data-ev-id="ev_869d159719" className="text-lg font-semibold">
                {isRenewal ? 'Renovar assinatura' : 'Ativar assinatura'}
              </h2>
              <p data-ev-id="ev_f0a3da9ae7" className="text-white/60 text-[13px]">Pagamento seguro e simulado</p>
            </div>
          </div>
        </div>

        {/* Plan summary */}
        <div data-ev-id="ev_03598b5b17" className="px-6 py-4 bg-violet-50 border-b border-violet-100">
          <div data-ev-id="ev_66eca7d87f" className="flex items-center justify-between">
            <div data-ev-id="ev_4e59fc968a" className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-violet-600" />
              <div data-ev-id="ev_ae0fc178ae">
                <p data-ev-id="ev_a6e04be7be" className="text-[14px] font-semibold text-neutral-900">{displayName}</p>
                <p data-ev-id="ev_817a4664ae" className="text-[12px] text-neutral-500">Acesso completo por 30 dias</p>
              </div>
            </div>
            <div data-ev-id="ev_194164222c" className="text-right">
              <p data-ev-id="ev_6972eb015a" className="text-xl font-bold text-neutral-900">{priceFormatted}</p>
              <p data-ev-id="ev_6cb94373da" className="text-[11px] text-neutral-500">/mês</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div data-ev-id="ev_ba31c1e136" className="px-6 py-5">
          <div data-ev-id="ev_c878f2c8bc" className="flex flex-col gap-4">
            <div data-ev-id="ev_54b7809c33">
              <label data-ev-id="ev_4a0e04ee93" className="block text-[13px] font-medium text-neutral-700 mb-1.5">
                Número do cartão
              </label>
              <input data-ev-id="ev_9525a17c2f"
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />

            </div>

            <div data-ev-id="ev_6f6842ff4f">
              <label data-ev-id="ev_e60c9a60af" className="block text-[13px] font-medium text-neutral-700 mb-1.5">
                Nome no cartão
              </label>
              <input data-ev-id="ev_3a7525b188"
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              placeholder="NOME COMPLETO"
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />

            </div>

            <div data-ev-id="ev_c7f382f3e2" className="grid grid-cols-2 gap-4">
              <div data-ev-id="ev_0d7d301a64">
                <label data-ev-id="ev_77ddfc9ce7" className="block text-[13px] font-medium text-neutral-700 mb-1.5">
                  Validade
                </label>
                <input data-ev-id="ev_e0d0ec2569"
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/AA"
                maxLength={5}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />

              </div>
              <div data-ev-id="ev_fbd88abb4a">
                <label data-ev-id="ev_3dc1683c6a" className="block text-[13px] font-medium text-neutral-700 mb-1.5">
                  CVV
                </label>
                <input data-ev-id="ev_9f587265f8"
                type="text"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                maxLength={4}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />

              </div>
            </div>
          </div>

          {/* Security note */}
          <div data-ev-id="ev_785e35fe1f" className="flex items-center gap-2 mt-4 text-[12px] text-neutral-500">
            <Shield className="w-4 h-4" />
            <span data-ev-id="ev_40dc47fd57">Ambiente de teste - nenhuma cobrança real será feita</span>
          </div>

          {/* Submit */}
          <button data-ev-id="ev_0854a9001e"
          onClick={handlePayment}
          disabled={processing}
          className="w-full mt-5 py-3.5 bg-violet-600 text-white text-[14px] font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">

            {processing ?
            <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </> :

            <>
                <Calendar className="w-4 h-4" />
                {isRenewal ? `Renovar por ${priceFormatted}` : `Pagar ${priceFormatted}`}
              </>
            }
          </button>
        </div>
      </DialogContent>
    </Dialog>);

}