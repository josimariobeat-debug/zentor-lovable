import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/toaster';
import loginBgAsset from '@/assets/uploads/login-bg.png.asset.json';
const loginBg = loginBgAsset.url;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao entrar';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-ev-id="ev_b4de78665f" className="min-h-screen bg-white flex flex-col lg:grid lg:grid-cols-[55%_45%] animate-in fade-in duration-500">
      {/* Left Panel - Desktop only */}
      <div data-ev-id="ev_b5cdbc16df" className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden text-white bg-[#0a0a0a]">
        {/* Logo - Maior e mais destacado */}
        <div data-ev-id="ev_6887832dbf" className="flex items-baseline gap-3 relative z-10">
          <span data-ev-id="ev_932933a862" className="text-[32px] font-bold tracking-tight">Zentor</span>
          <span data-ev-id="ev_4426990208" className="text-[11px] font-medium tracking-[0.2em] uppercase text-neutral-500">
            Sites & Ferramentas
          </span>
        </div>

        {/* Content */}
        <div data-ev-id="ev_57f7fb8f9c" className="relative z-10 flex-1 flex flex-col justify-center">
          <h2 data-ev-id="ev_247610dbf8" className="text-[42px] leading-[1.05] font-semibold tracking-tight max-w-[420px]">
            Workspace elegante<br data-ev-id="ev_64ee66eecd" />para sua loja.
          </h2>
          <p data-ev-id="ev_29657b14a7" className="text-[15px] text-neutral-400 mt-6 leading-relaxed max-w-[380px]">
            Ferramentas e apps que se conectam à sua loja em minutos.<br data-ev-id="ev_7646759809" />
            Stories, avaliações, pop-ups e mais.
          </p>
        </div>

        {/* Illustration com animação */}
        <div data-ev-id="ev_4d7201fa38" className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[8%] w-[62%] pointer-events-none animate-in slide-in-from-right-8 duration-700 delay-200">
          <img data-ev-id="ev_83a52e2c15"
          src={loginIllustration}
          alt="Ilustração 3D de dashboard"
          className="w-full h-auto object-contain drop-shadow-2xl" />

        </div>

        {/* Gradient overlay premium */}
        <div data-ev-id="ev_68beacdc67" className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/85 to-transparent pointer-events-none" />
        
        {/* Linha decorativa na divisão */}
        <div data-ev-id="ev_d4a80ad2f4" className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />

        {/* Footer */}
        <div data-ev-id="ev_978c03d2ea" className="text-[12px] text-neutral-600 relative z-10">© {new Date().getFullYear()} Zentor</div>
      </div>

      {/* Right Panel - Form com transição elegante */}
      <div data-ev-id="ev_212ef6a7a8" className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
        {/* Mobile Logo - Centralizado */}
        <div data-ev-id="ev_8693d7cf68" className="flex lg:hidden flex-col items-center gap-1 mb-12">
          <span data-ev-id="ev_a4ff868344" className="text-[28px] font-bold tracking-tight text-neutral-900">Zentor</span>
          <span data-ev-id="ev_ac335ed195" className="text-[10px] font-medium tracking-[0.18em] uppercase text-neutral-400">
            Sites & Ferramentas
          </span>
        </div>

        <form data-ev-id="ev_eb3be7a814" onSubmit={submit} className="w-full max-w-[360px]">
          <h1 data-ev-id="ev_47acee1840" className="text-[26px] font-semibold tracking-tight text-neutral-900 lg:text-left text-center">
            Bem-vindo de volta
          </h1>
          <p data-ev-id="ev_5346667d8a" className="text-[14px] text-neutral-500 mt-2 mb-8 lg:text-left text-center">
            Acesse sua conta para continuar.
          </p>

          <label data-ev-id="ev_d3e9a768a1" className="text-[13px] font-medium text-neutral-700 block mb-1.5">
            E-mail
          </label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="h-[52px] rounded-xl border-neutral-200 bg-neutral-50/50 mb-5 text-[15px] transition-all focus:bg-white focus:shadow-sm" />


          <label data-ev-id="ev_fe400a3a75" className="text-[13px] font-medium text-neutral-700 block mb-1.5">
            Senha
          </label>
          <div data-ev-id="ev_573b96baa3" className="relative mb-2">
            <Input
              type={show ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="h-[52px] rounded-xl border-neutral-200 bg-neutral-50/50 pr-12 text-[15px] transition-all focus:bg-white focus:shadow-sm" />

            <button data-ev-id="ev_ddb2c249ae"
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors">

              {show ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
          <div data-ev-id="ev_130ae39b31" className="flex justify-end mb-8">
            <span data-ev-id="ev_db3d03cfb3" className="text-[12px] text-neutral-400">Mínimo 6 caracteres</span>
          </div>

          <button data-ev-id="ev_5732c9c0a6"
          type="submit"
          disabled={loading}
          className="w-full h-[52px] rounded-xl bg-neutral-900 text-white text-[15px] font-medium hover:bg-neutral-800 disabled:opacity-60 transition-all hover:shadow-lg hover:shadow-neutral-900/20 active:scale-[0.98]">

            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <p data-ev-id="ev_2f60219299" className="text-center text-[14px] text-neutral-500 mt-8">
            Não tem conta?{' '}
            <Link to="/register" className="text-neutral-900 font-medium hover:underline underline-offset-2">
              Criar conta
            </Link>
          </p>
        </form>
      </div>
    </div>);

}