import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Activate or renew the user's main monthly subscription.
 * Inserts/updates subscriptions, payments, and installs the bundled
 * stories-videos app. All writes happen server-side with service role.
 */
export const activateMainSubscription = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const userId = context.userId;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + THIRTY_DAYS_MS);
    const price = 29.9;

    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let subscriptionId: string | undefined = existingSub?.id;

    if (existingSub) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          price,
        })
        .eq('id', existingSub.id);
    } else {
      const { data: inserted } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan: 'mensal',
          status: 'active',
          price,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .select('id')
        .single();
      subscriptionId = inserted?.id;
    }

    await supabaseAdmin.from('payments').insert({
      user_id: userId,
      subscription_id: subscriptionId,
      amount: price,
      status: 'completed',
      payment_method: 'simulated',
      paid_at: now.toISOString(),
    });

    const { data: existingApp } = await supabaseAdmin
      .from('installed_apps')
      .select('id')
      .eq('user_id', userId)
      .eq('app_id', 'stories-videos')
      .maybeSingle();

    if (existingApp) {
      await supabaseAdmin
        .from('installed_apps')
        .update({ status: 'ativa', expires_at: expiresAt.toISOString() })
        .eq('id', existingApp.id);
    } else {
      await supabaseAdmin.from('installed_apps').insert({
        user_id: userId,
        app_key: 'stories-videos',
        app_id: 'stories-videos',
        name: 'Stories Vídeos',
        type: 'SCRIPT EXTERNO',
        description:
          'Crie e gerencie stories e vídeos com player flutuante e carrossel na sua loja.',
        status: 'ativa',
        expires_at: expiresAt.toISOString(),
      });
    }

    return { ok: true };
  });

/**
 * Activate or renew a specific app from the store.
 */
export const activateAppSubscription = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      appId: string;
      name: string;
      description: string;
      type: string;
      price: number;
    }) => {
      if (!data?.appId || typeof data.appId !== 'string') throw new Error('appId required');
      if (typeof data.price !== 'number' || data.price < 0 || data.price > 100000) {
        throw new Error('invalid price');
      }
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const userId = context.userId;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + THIRTY_DAYS_MS);

    const { data: existingApp } = await supabaseAdmin
      .from('installed_apps')
      .select('id')
      .eq('user_id', userId)
      .eq('app_id', data.appId)
      .maybeSingle();

    if (existingApp) {
      await supabaseAdmin
        .from('installed_apps')
        .update({
          status: 'active',
          is_installed: true,
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', existingApp.id);
    } else {
      await supabaseAdmin.from('installed_apps').insert({
        user_id: userId,
        app_key: data.appId,
        app_id: data.appId,
        name: data.name,
        type: data.type,
        description: data.description,
        status: 'active',
        is_installed: true,
        expires_at: expiresAt.toISOString(),
      });
    }

    await supabaseAdmin.from('payments').insert({
      user_id: userId,
      amount: data.price,
      status: 'completed',
      payment_method: 'simulated',
      paid_at: now.toISOString(),
    });

    return { ok: true };
  });

/**
 * Mark an existing installed app as installed (no payment required).
 */
export const markAppInstalled = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { installedAppId: string }) => {
    if (!data?.installedAppId) throw new Error('installedAppId required');
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await supabaseAdmin
      .from('installed_apps')
      .update({ is_installed: true })
      .eq('id', data.installedAppId)
      .eq('user_id', context.userId);
    return { ok: true };
  });

/**
 * Renew a specific installed app subscription (used by Assinaturas page).
 */
export const renewInstalledApp = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { installedAppId: string; price?: number }) => {
    if (!data?.installedAppId) throw new Error('installedAppId required');
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const userId = context.userId;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + THIRTY_DAYS_MS);
    const price = typeof data.price === 'number' && data.price >= 0 ? data.price : 29.9;

    const { data: app } = await supabaseAdmin
      .from('installed_apps')
      .select('id')
      .eq('id', data.installedAppId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!app) throw new Error('App not found');

    await supabaseAdmin
      .from('installed_apps')
      .update({ status: 'active', expires_at: expiresAt.toISOString() })
      .eq('id', app.id);

    await supabaseAdmin.from('payments').insert({
      user_id: userId,
      amount: price,
      status: 'completed',
      payment_method: 'simulated',
      paid_at: now.toISOString(),
    });

    return { ok: true };
  });
