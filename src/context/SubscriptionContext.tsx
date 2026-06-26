import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { Tables } from '@/integrations/supabase/helpers';

type Subscription = Tables<'subscriptions'>;

interface SubscriptionContextType {
  subscription: Subscription | null;
  hasActiveSubscription: boolean;
  hasSeenOnboarding: boolean;
  loading: boolean;
  daysRemaining: number;
  subscribe: () => Promise<void>;
  renewSubscription: () => Promise<void>;
  markOnboardingSeen: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async (userId: string) => {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (sub) {
      if (sub.status === 'active' && sub.expires_at) {
        const isExpired = new Date(sub.expires_at) < new Date();
        if (isExpired) {
          await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id);
          setSubscription({ ...sub, status: 'expired' });
        } else {
          setSubscription(sub);
        }
      } else {
        setSubscription(sub);
      }
    } else {
      setSubscription(null);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('has_seen_onboarding')
      .eq('id', userId)
      .maybeSingle();

    setHasSeenOnboarding(profile?.has_seen_onboarding ?? false);
  }, []);

  useEffect(() => {
    if (!userId) {
      setSubscription(null);
      setHasSeenOnboarding(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchSubscription(userId).finally(() => setLoading(false));
  }, [fetchSubscription, userId]);

  const hasActiveSubscription = !!(
    subscription?.status === 'active' &&
    subscription.expires_at &&
    new Date(subscription.expires_at) > new Date()
  );

  const daysRemaining = useMemo(() => {
    if (!subscription?.expires_at) return 0;
    const diff = new Date(subscription.expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [subscription?.expires_at]);

  const subscribe = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingSub) {
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          price: 29.90,
        })
        .eq('id', existingSub.id);
    } else {
      await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan: 'mensal',
        status: 'active',
        price: 29.90,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    await supabase.from('payments').insert({
      user_id: user.id,
      subscription_id: sub?.id,
      amount: 29.90,
      status: 'completed',
      payment_method: 'simulated',
      paid_at: now.toISOString(),
    });

    const { data: existingApp } = await supabase
      .from('installed_apps')
      .select('id')
      .eq('user_id', user.id)
      .eq('app_id', 'stories-videos')
      .maybeSingle();

    if (!existingApp) {
      await supabase.from('installed_apps').insert({
        user_id: user.id,
        app_key: 'stories-videos',
        app_id: 'stories-videos',
        name: 'Stories Vídeos',
        type: 'SCRIPT EXTERNO',
        description: 'Crie e gerencie stories e vídeos com player flutuante e carrossel na sua loja.',
        status: 'ativa',
        expires_at: expiresAt.toISOString(),
      });
    } else {
      await supabase
        .from('installed_apps')
        .update({ status: 'ativa', expires_at: expiresAt.toISOString() })
        .eq('id', existingApp.id);
    }

    await fetchSubscription(user.id);
  }, [fetchSubscription, user]);

  const renewSubscription = useCallback(async () => {
    await subscribe();
  }, [subscribe]);

  const markOnboardingSeen = useCallback(async () => {
    if (!user) return;
    await supabase.from('profiles').update({ has_seen_onboarding: true }).eq('id', user.id);
    setHasSeenOnboarding(true);
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    await fetchSubscription(user.id);
  }, [fetchSubscription, user]);

  const value = useMemo(
    () => ({
      subscription,
      hasActiveSubscription,
      hasSeenOnboarding,
      loading,
      daysRemaining,
      subscribe,
      renewSubscription,
      markOnboardingSeen,
      refresh,
    }),
    [
      subscription,
      hasActiveSubscription,
      hasSeenOnboarding,
      loading,
      daysRemaining,
      subscribe,
      renewSubscription,
      markOnboardingSeen,
      refresh,
    ]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
};
