import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sparkles, ShoppingBag, Video, MessageSquare, BarChart3, ArrowRight, Check } from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WelcomeModal({ open, onOpenChange }: WelcomeModalProps) {
  const navigate = useNavigate();
  const { markOnboardingSeen } = useSubscription();
  const [step, setStep] = useState(0);

  const steps = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao Zentor!',
    description: 'A plataforma completa de ferramentas para impulsionar seu e-commerce. Transforme sua loja com apps poderosos e fáceis de usar.',
    features: [
    'Diversos apps para seu e-commerce',
    'Fácil integração com qualquer loja',
    'Suporte dedicado']

  },
  {
    icon: ShoppingBag,
    title: 'Apps para cada necessidade',
    description: 'Temos várias ferramentas para aumentar suas vendas e melhorar a experiência dos seus clientes.',
    features: [
    { icon: Video, text: 'Stories Vídeos - Engaje com vídeos' },
    { icon: MessageSquare, text: 'Avaliações Pro - Colete feedbacks' },
    { icon: BarChart3, text: 'E muito mais na nossa loja!' }]

  },
  {
    icon: ArrowRight,
    title: 'Como começar?',
    description: 'É simples! Vá até a Loja de Apps, escolha os apps que deseja e assine. Cada app tem sua própria assinatura mensal.',
    features: [
    'Acesse a Loja de Apps',
    'Escolha o app desejado',
    'Assine e comece a usar!']

  }];


  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  const handleNext = async () => {
    if (isLastStep) {
      await markOnboardingSeen();
      onOpenChange(false);
      navigate('/loja');
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = async () => {
    await markOnboardingSeen();
    onOpenChange(false);
  };

  const handleGoToStore = async () => {
    await markOnboardingSeen();
    onOpenChange(false);
    navigate('/loja');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] p-0 overflow-hidden border-0 rounded-2xl">
        {/* Header gradient */}
        <div data-ev-id="ev_1aae136daa" className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 px-8 pt-10 pb-8 text-white">
          <div data-ev-id="ev_e9e4e5e6c9" className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
            <currentStep.icon className="w-8 h-8" />
          </div>
          <h2 data-ev-id="ev_c3a1e5abe0" className="text-2xl font-bold mb-2">{currentStep.title}</h2>
          <p data-ev-id="ev_25d0fa22d4" className="text-white/80 text-[15px] leading-relaxed">{currentStep.description}</p>
        </div>

        {/* Content */}
        <div data-ev-id="ev_541d880ee0" className="px-8 py-6">
          <div data-ev-id="ev_e648cf1cc2" className="flex flex-col gap-3 mb-8">
            {currentStep.features.map((feature, idx) =>
            <div data-ev-id="ev_fd9d07e0be" key={idx} className="flex items-center gap-3">
                {typeof feature === 'string' ?
              <>
                    <div data-ev-id="ev_32322320f6" className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span data-ev-id="ev_5bcad1b0db" className="text-[14px] text-neutral-700">{feature}</span>
                  </> :

              <>
                    <div data-ev-id="ev_f6342d9c4f" className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-4 h-4 text-violet-600" />
                    </div>
                    <span data-ev-id="ev_6397186012" className="text-[14px] text-neutral-700">{feature.text}</span>
                  </>
              }
              </div>
            )}
          </div>

          {/* Progress dots */}
          <div data-ev-id="ev_6b83dd4df6" className="flex items-center justify-center gap-2 mb-6">
            {steps.map((_, idx) =>
            <button data-ev-id="ev_9a6c993f84"
            key={idx}
            onClick={() => setStep(idx)}
            className={`w-2 h-2 rounded-full transition-all ${
            idx === step ?
            'w-6 bg-violet-600' :
            idx < step ?
            'bg-violet-400' :
            'bg-neutral-200'}`
            } />

            )}
          </div>

          {/* Actions */}
          <div data-ev-id="ev_7da57ff584" className="flex items-center gap-3">
            {!isLastStep &&
            <button data-ev-id="ev_25d3c9355d"
            onClick={handleSkip}
            className="flex-1 py-3 text-[14px] font-medium text-neutral-500 hover:text-neutral-700 transition-colors">

                Pular
              </button>
            }
            <button data-ev-id="ev_5ac44c4e4f"
            onClick={isLastStep ? handleGoToStore : handleNext}
            className="flex-1 py-3 px-6 bg-neutral-900 text-white text-[14px] font-semibold rounded-xl hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2">

              {isLastStep ?
              <>
                  <ShoppingBag className="w-4 h-4" />
                  Ir para a Loja
                </> :

              <>
                  Próximo
                  <ArrowRight className="w-4 h-4" />
                </>
              }
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);

}