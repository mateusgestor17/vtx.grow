import { FormEvent, ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Brand, VortexRings } from '../components/ui';

function translate(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Este e-mail já possui uma conta. Faça login.';
  if (m.includes('password should be')) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  return msg;
}

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-brand">
        <VortexRings />
        <Brand />
        <div className="brand-mid">
          <span className="eyebrow">Para esquadrias e vidraçarias</span>
          <h1>Mostre o projeto pronto <em>antes de vender.</em></h1>
          <p>Simule com IA como o projeto vai ficar na foto do cliente, monte orçamentos em PDF com medidas e vidros e siga um plano de crescimento feito para o seu negócio.</p>
        </div>
        <div className="brand-stats">
          <div><b>Antes e depois</b><small>simulador com IA</small></div>
          <div><b>PDF de vendas</b><small>orçamento completo</small></div>
          <div><b>Plano</b><small>de crescimento</small></div>
        </div>
      </div>
      <div className="auth-form">
        <div className="auth-card">
          <div className="logo-center">
            <img src="/vortex-logo-ink.png" alt="Vortex Company" />
            <div className="brand-word" style={{ marginTop: 6 }}>VTX<span>.</span>GROW</div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setErr(translate(error.message));
    nav('/app');
  }
  return (
    <AuthLayout>
      <h2>Bem-vindo de volta</h2>
      <p className="sub">Entre para acessar seu simulador, orçamentos e plano de crescimento.</p>
      <form onSubmit={submit}>
        {err && <div className="error">{err}</div>}
        <div className="field"><label htmlFor="email">E-mail</label><input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com.br" /></div>
        <div className="field"><label htmlFor="pw">Senha</label><input id="pw" className="input" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" /></div>
        <div className="auth-link-row"><Link to="/recuperar">Esqueci minha senha</Link></div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <div className="auth-foot">Ainda não tem conta? <Link to="/cadastro">Criar conta grátis</Link></div>
    </AuthLayout>
  );
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function Signup() {
  const nav = useNavigate();
  const [f, setF] = useState({ first: '', last: '', email: '', phone: '', password: '', confirm: '', terms: false });
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: any) => setF(s => ({ ...s, [k]: v }));
  async function submit(e: FormEvent) {
    e.preventDefault(); setErr('');
    if (f.password.length < 8) return setErr('A senha precisa ter pelo menos 8 caracteres.');
    if (f.password !== f.confirm) return setErr('As senhas não coincidem.');
    if (f.phone.replace(/\D/g, '').length < 10) return setErr('Informe um WhatsApp válido com DDD.');
    if (!f.terms) return setErr('É necessário aceitar os termos e a política de privacidade.');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim(), password: f.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { first_name: f.first.trim(), last_name: f.last.trim(), phone: f.phone, terms_accepted: 'true' },
      },
    });
    setBusy(false);
    if (error) return setErr(translate(error.message));
    if (data.user && data.user.identities && data.user.identities.length === 0) return setErr('Este e-mail já possui uma conta. Faça login.');
    if (data.session) nav('/app'); else setDone(true);
  }
  if (done) return (
    <AuthLayout>
      <h2>Confirme seu e-mail</h2>
      <p className="sub">Enviamos um link de confirmação para <b style={{ color: '#fff' }}>{f.email}</b>. Clique nele para ativar sua conta e começar o diagnóstico.</p>
      <Link className="btn btn-ghost btn-block" to="/login">Voltar para o login</Link>
    </AuthLayout>
  );
  return (
    <AuthLayout>
      <h2>Crie sua conta</h2>
      <p className="sub">Leva menos de um minuto. Depois, você responde o diagnóstico.</p>
      <form onSubmit={submit}>
        {err && <div className="error">{err}</div>}
        <div className="row2">
          <div className="field"><label htmlFor="fn">Nome</label><input id="fn" className="input" required value={f.first} onChange={e => set('first', e.target.value)} autoComplete="given-name" /></div>
          <div className="field"><label htmlFor="ln">Sobrenome</label><input id="ln" className="input" required value={f.last} onChange={e => set('last', e.target.value)} autoComplete="family-name" /></div>
        </div>
        <div className="field"><label htmlFor="em">E-mail</label><input id="em" className="input" type="email" required value={f.email} onChange={e => set('email', e.target.value)} autoComplete="email" placeholder="voce@empresa.com.br" /></div>
        <div className="field"><label htmlFor="ph">WhatsApp</label><input id="ph" className="input" inputMode="tel" required value={f.phone} onChange={e => set('phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" autoComplete="tel" /></div>
        <div className="row2">
          <div className="field"><label htmlFor="pw">Senha</label><input id="pw" className="input" type="password" required value={f.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" placeholder="Mín. 8 caracteres" /></div>
          <div className="field"><label htmlFor="pw2">Confirmar senha</label><input id="pw2" className="input" type="password" required value={f.confirm} onChange={e => set('confirm', e.target.value)} autoComplete="new-password" /></div>
        </div>
        <label className="check"><input type="checkbox" checked={f.terms} onChange={e => set('terms', e.target.checked)} />
          <span>Li e aceito os termos de uso e a política de privacidade. Entendo que meus dados serão usados pela Vortex Company para gerar meu diagnóstico e entrar em contato, conforme a LGPD.</span></label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Criando conta…' : 'Criar conta e começar'}</button>
      </form>
      <div className="auth-foot">Já tem conta? <Link to="/login">Entrar</Link></div>
    </AuthLayout>
  );
}

export function Forgot() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setErr('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/redefinir-senha` });
    if (error) return setErr(translate(error.message));
    setSent(true);
  }
  return (
    <AuthLayout>
      <h2>Recuperar senha</h2>
      <p className="sub">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
      {sent ? <div className="notice">Se existir uma conta com esse e-mail, você receberá o link em instantes.</div> : (
        <form onSubmit={submit}>
          {err && <div className="error">{err}</div>}
          <div className="field"><label htmlFor="em">E-mail</label><input id="em" className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <button className="btn btn-primary btn-block">Enviar link</button>
        </form>
      )}
      <div className="auth-foot"><Link to="/login">Voltar para o login</Link></div>
    </AuthLayout>
  );
}

export function ResetPassword() {
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setErr('');
    if (pw.length < 8) return setErr('A senha precisa ter pelo menos 8 caracteres.');
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setErr(translate(error.message));
    nav('/app');
  }
  return (
    <AuthLayout>
      <h2>Nova senha</h2>
      <p className="sub">Defina sua nova senha de acesso.</p>
      <form onSubmit={submit}>
        {err && <div className="error">{err}</div>}
        <div className="field"><label htmlFor="pw">Nova senha</label><input id="pw" className="input" type="password" required value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" /></div>
        <button className="btn btn-primary btn-block">Salvar e entrar</button>
      </form>
    </AuthLayout>
  );
}
