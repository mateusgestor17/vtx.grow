import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface Profile { id: string; first_name: string | null; last_name: string | null; email: string; phone: string | null; role: 'client' | 'analyst' | 'admin' }

interface Ctx { session: Session | null; profile: Profile | null; loading: boolean; isStaff: boolean; refresh: () => Promise<void> }
const AuthCtx = createContext<Ctx>({ session: null, profile: null, loading: true, isStaff: false, refresh: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(s: Session | null) {
    if (!s) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('id,first_name,last_name,email,phone,role').eq('id', s.user.id).maybeSingle();
    setProfile(data as Profile | null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // evita deadlock do supabase-js: faz chamadas fora do callback
      setTimeout(async () => {
        await loadProfile(s);
        if (event === 'SIGNED_IN' && s) supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', s.user.id).then(() => {});
      }, 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const isStaff = profile?.role === 'admin' || profile?.role === 'analyst';
  return <AuthCtx.Provider value={{ session, profile, loading, isStaff, refresh: () => loadProfile(session) }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
