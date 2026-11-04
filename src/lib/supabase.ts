import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// WhatsApp oficial da Vortex (47) 99162-5752. A variável de ambiente só substitui se tiver um número real.
const DEFAULT_WHATSAPP = '5547991625752';
const envWhats = String(import.meta.env.VITE_VORTEX_WHATSAPP || '').replace(/\D/g, '');
export const VORTEX_WHATSAPP = envWhats.length >= 12 && !/^55000/.test(envWhats) ? envWhats : DEFAULT_WHATSAPP;

export function whatsappLink(text: string) {
  return `https://wa.me/${VORTEX_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

export async function logAudit(action: string, resource_type?: string, resource_id?: string, details?: Record<string, unknown>) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from('audit_log').insert({ actor_id: data.user.id, action, resource_type, resource_id, details });
}
