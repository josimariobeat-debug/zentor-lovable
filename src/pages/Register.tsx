import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/toaster';
import loginIllustration from '@/assets/uploads/login-illustration.png';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Conta criada com sucesso!');
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao criar conta';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-ev-id="ev_f1ad481d6a" className="min-h-screen bg-white flex flex-col lg:grid lg:grid-cols-[55%_45%] animate-in fade-in duration-500">
      {/* Left Panel - Desktop only */}
      <div data-ev-id="ev_368a1b8171" className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden text-white bg-[#0a0a0a]">
        {/* Logo - Maior e mais destacado */}
        <div data-ev-id="ev_c616057fde" className="flex items-baseline gap-3 relative z-10">
          <span data-ev-id="ev_285396bc22" className="text-[32px] font-bold tracking-tight">Zentor</span>
          <span data-ev-id="ev_fd838164f5" className="text-[11px] font-medium tracking-[0.2em] uppercase text-neutral-500">
            Sites & Ferramentas
          </span>
        </div>

        {/* Content */}
        <div data-ev-id="ev_aa5174dd1a" className="relative z-10 flex-1 flex flex-col justify-center">
          <h2 data-ev-id="ev_8ac733779f" className="text-[42px] leading-[1.05] font-semibold tracking-tight max-w-[420px]">
            Crie sua conta e<br data-ev-id="ev_3e5965e8d6" />comece em minutos.
          </h2>
          <p data-ev-id="ev_069b7c37c5" className="text-[15px] text-neutral-400 mt-6 leading-relaxed max-w-[380px]">
            Adicione apps, gerencie assinaturas e<br data-ev-id="ev_fba94acd54" />eleve sua loja a outro nível.
          </p>
        </div>

        {/* Illustration com animação */}
        <div data-ev-id="ev_8a9ab416fc" className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[8%] w-[62%] pointer-events-none animate-in slide-in-from-right-8 duration-700 delay-200">
          <img data-ev-id="ev_d3313a7c36"
          src={loginIllustration}
          alt="Ilustração 3D de dashboard"
          className="w-full h-auto object-contain drop-shadow-2xl" />

        </div>

        {/* Gradient overlay premium */}
        <div data-ev-id="ev_9c45ee0ba6" className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/85 to-transparent pointer-events-none" />
        
        {/* Linha decorativa na divisão */}
        <div data-ev-id="ev_f3366b9f4c" className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />

        {/* Footer */}
        <div data-ev-id="ev_9e5490a950" className="text-[12px] text-neutral-600 relative z-10">© {new Date().getFullYear()} Zentor</div>
      </div>

      {/* Right Panel - Form com transição elegante */}
      <div data-ev-id="ev_f26c5c70e8" className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
        {/* Mobile Logo - Centralizado */}
        <div data-ev-id="ev_7d0b55d2f5" className="flex lg:hidden flex-col items-center gap-1 mb-12">
          <span data-ev-id="ev_8c4cc63442" className="text-[28px] font-bold tracking-tight text-neutral-900">Zentor</span>
          <span data-ev-id="ev_0f8fed5053" className="text-[10px] font-medium tracking-[0.18em] uppercase text-neutral-400">
            Sites & Ferramentas
          </span>
        </div>

        <form data-ev-id="ev_de2c743427" onSubmit={submit} className="w-full max-w-[360px]">
          <h1 data-ev-id="ev_5d4d768f43" className="text-[26px] font-semibold tracking-tight text-neutral-900 lg:text-left text-center">
            Criar conta
          </h1>
          <p data-ev-id="ev_a59f4f37db" className="text-[14px] text-neutral-500 mt-2 mb-8 lg:text-left text-center">
            Comece grátis. Sem cartão de crédito.
          </p>

          <label data-ev-id="ev_dc3c48251d" className="text-[13px] font-medium text-neutral-700 block mb-1.5">
            Nome da loja
          </label>
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Minha Loja"
            className="h-[52px] rounded-xl border-neutral-200 bg-neutral-50/50 mb-5 text-[15px] transition-all focus:bg-white focus:shadow-sm" />


          <label data-ev-id="ev_5540004c81" className="text-[13px] font-medium text-neutral-700 block mb-1.5">
            E-mail
          </label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="h-[52px] rounded-xl border-neutral-200 bg-neutral-50/50 mb-5 text-[15px] transition-all focus:bg-white focus:shadow-sm" />


          <label data-ev-id="ev_81ab84322f" className="text-[13px] font-medium text-neutral-700 block mb-1.5">
            Senha
          </label>
          <Input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="h-[52px] rounded-xl border-neutral-200 bg-neutral-50/50 mb-8 text-[15px] transition-all focus:bg-white focus:shadow-sm" />


          <button data-ev-id="ev_31a08826c5"
          type="submit"
          disabled={loading}
          className="w-full h-[52px] rounded-xl bg-neutral-900 text-white text-[15px] font-medium hover:bg-neutral-800 disabled:opacity-60 transition-all hover:shadow-lg hover:shadow-neutral-900/20 active:scale-[0.98]">

            {loading ? 'Criando…' : 'Criar conta'}
          </button>

          <p data-ev-id="ev_593770a247" className="text-center text-[14px] text-neutral-500 mt-8">
            Já tem conta?{' '}
            <Link to="/login" className="text-neutral-900 font-medium hover:underline underline-offset-2">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>);

}