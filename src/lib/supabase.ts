import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const VORTEX_WHATSAPP = (import.meta.env.VITE_VORTEX_WHATSAPP as string) || '';

export function whatsappLink(text: string) {
  return `https://wa.me/${VORTEX_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

export async function logAudit(action: string, resource_type?: string, resource_id?: string, details?: Record<string, unknown>) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from('audit_log').insert({ actor_id: data.user.id, action, resource_type, resource_id, details });
}
