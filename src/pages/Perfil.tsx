import { useState, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/toaster';

export default function Perfil() {
  const { user, profile, refresh } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;

    setSaving(true);
    try {
      const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
      await supabase.
      from('profiles').
      update({ name, email, initials }).
      eq('id', user.id);
      await refresh();
      toast.success('Perfil atualizado');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopBar title="Perfil" />
      <main data-ev-id="ev_6312547cc8" className="px-10 py-10 fade-in max-w-2xl">
        <div data-ev-id="ev_136d00e8b1" className="flex items-center gap-5 mb-10">
          <div data-ev-id="ev_381f4e08ad" className="w-20 h-20 rounded-full bg-neutral-900 text-white flex items-center justify-center text-2xl font-semibold">
            {profile?.initials || '·'}
          </div>
          <div data-ev-id="ev_9828f383d7">
            <h2 data-ev-id="ev_9cb684544c" className="text-[20px] font-semibold text-neutral-900">{profile?.name}</h2>
            <p data-ev-id="ev_3017f81584" className="text-[14px] text-neutral-500">{profile?.email}</p>
          </div>
        </div>

        <form data-ev-id="ev_9b9ae15c92" onSubmit={save} className="bg-white border border-neutral-200 rounded-2xl p-7 flex flex-col gap-5">
          <div data-ev-id="ev_364360d263">
            <label data-ev-id="ev_9d12280cbf" className="text-[13px] font-medium text-neutral-700 block mb-2">Nome da loja</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl border-neutral-200" />
          </div>
          <div data-ev-id="ev_25d37fbcec">
            <label data-ev-id="ev_97ea7678c3" className="text-[13px] font-medium text-neutral-700 block mb-2">E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl border-neutral-200" />

          </div>
          <div data-ev-id="ev_d1f68a2881" className="flex justify-end pt-2">
            <button data-ev-id="ev_476a28056a"
            type="submit"
            disabled={saving}
            className="text-[14px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60 px-5 py-2.5 rounded-xl transition-colors">

              {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </main>
    </>);

}