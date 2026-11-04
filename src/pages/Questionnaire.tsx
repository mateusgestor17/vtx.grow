import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, logAudit } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Answers, isAnswered, NONE, Q, Question, QUESTIONNAIRE_VERSION, STEPS, UFS, UNKNOWN } from '../lib/questions';
import { analyze, ENGINE_VERSION } from '../lib/engine';
import { Brand, Loading, VortexRings } from '../components/ui';

function QuestionInput({ q, a, set }: { q: Question; a: Answers; set: (k: string, v: any) => void }) {
  const v = a[q.id];
  const unknown = v === UNKNOWN;
  const none = v === NONE;
  const disabled = unknown || none;
  const toggle = (val: string) => set(q.id, v === val ? '' : val);

  let body: JSX.Element;
  switch (q.type) {
    case 'select':
      body = (
        <>
          <div className="opts">
            {q.options!.map(o => (
              <button type="button" key={o} className={`opt radio ${v === o ? 'on' : ''}`} onClick={() => set(q.id, o)}><span className="box" />{o}</button>
            ))}
          </div>
          {q.allowOther && v === 'Outro' && <input className="input" placeholder="Qual?" value={a[q.id + '_other'] || ''} onChange={e => set(q.id + '_other', e.target.value)} autoFocus />}
        </>
      );
      break;
    case 'multi': {
      const arr: string[] = Array.isArray(v) ? v : [];
      body = (
        <div className="opts">
          {q.options!.map(o => {
            const on = arr.includes(o);
            return <button type="button" key={o} className={`opt ${on ? 'on' : ''}`} onClick={() => set(q.id, on ? arr.filter(x => x !== o) : [...arr, o])}><span className="box" />{o}</button>;
          })}
        </div>
      );
      break;
    }
    case 'textarea':
      body = <textarea className="textarea" placeholder={q.placeholder} value={v || ''} onChange={e => set(q.id, e.target.value)} />;
      break;
    case 'citystate':
      body = (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10 }}>
          <input className="input" placeholder="Cidade" value={a.q3_city || ''} onChange={e => { set('q3_city', e.target.value); set('q3', `${e.target.value} - ${a.q3_uf || ''}`); }} />
          <select className="select" value={a.q3_uf || ''} onChange={e => { set('q3_uf', e.target.value); set('q3', `${a.q3_city || ''} - ${e.target.value}`); }}>
            <option value="">UF</option>{UFS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      );
      break;
    case 'currency':
      body = (
        <div className="input-wrap has-prefix">
          <span className="prefix">R$</span>
          <input className="input" inputMode="numeric" disabled={disabled} placeholder="0"
            value={disabled || v === undefined || v === '' ? '' : Number(v).toLocaleString('pt-BR')}
            onChange={e => { const d = e.target.value.replace(/\D/g, ''); set(q.id, d === '' ? '' : Number(d)); }} />
        </div>
      );
      break;
    case 'number': case 'percent':
      body = (
        <div className="input-wrap" style={{ maxWidth: 320 }}>
          <input className="input" inputMode="numeric" disabled={disabled} placeholder="0"
            value={disabled || v === undefined ? '' : v}
            onChange={e => { const d = e.target.value.replace(q.type === 'percent' ? /[^\d]/g : /\D/g, ''); set(q.id, d === '' ? '' : Math.min(Number(d), q.type === 'percent' ? 100 : 1e9)); }} />
          {q.suffix && <span className="suffix">{q.suffix}</span>}
        </div>
      );
      break;
    default:
      body = <input className="input" disabled={disabled} placeholder={q.placeholder} value={disabled ? '' : v || ''} onChange={e => set(q.id, e.target.value)} />;
  }

  return (
    <div className="qcard">
      <div className="qn">PERGUNTA {q.n} DE 30</div>
      <div className="ql">{q.label}</div>
      {q.help && <div className="qh">{q.help}</div>}
      <div className="qbody">
        {body}
        <div className="row" style={{ gap: 8 }}>
          {q.allowUnknown && <button type="button" className={`mini-toggle ${unknown ? 'on' : ''}`} onClick={() => toggle(UNKNOWN)}>Não sei</button>}
          {q.noneLabel && <button type="button" className={`mini-toggle ${none ? 'on' : ''}`} onClick={() => toggle(NONE)}>{q.noneLabel}</button>}
        </div>
      </div>
    </div>
  );
}

export default function Questionnaire() {
  const { session } = useAuth();
  const nav = useNavigate();
  const [diagId, setDiagId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [processing, setProcessing] = useState<string[] | null>(null);
  const [err, setErr] = useState('');
  const timer = useRef<number | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const uid = session!.user.id;
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const loadDraft = async () => {
        const { data } = await supabase.from('diagnostics').select('id,answers,current_step').eq('user_id', uid).eq('status', 'draft').limit(1);
        if (data && data[0]) { setDiagId(data[0].id); setAnswers(data[0].answers || {}); setStep(Math.min(data[0].current_step || 0, STEPS.length - 1)); return true; }
        return false;
      };
      if (!(await loadDraft())) {
        // Reaproveita respostas do último diagnóstico concluído para facilitar a atualização
        const { data: last } = await supabase.from('diagnostics').select('answers').eq('user_id', uid).eq('status', 'completed').order('created_at', { ascending: false }).limit(1);
        const start = last?.[0]?.answers || {};
        const { data: created, error } = await supabase.from('diagnostics').insert({ user_id: uid, answers: start, questionnaire_version: QUESTIONNAIRE_VERSION }).select('id').single();
        if (error) { if (!(await loadDraft())) setErr('Não foi possível iniciar o diagnóstico. ' + error.message); }
        else { setDiagId(created.id); setAnswers(start); logAudit('diagnostic_started', 'diagnostic', created.id); }
      }
      setLoading(false);
    })();
  }, [uid]);

  function persist(next: Answers, nextStep = step) {
    if (!diagId) return;
    setSaved('saving');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      await supabase.from('diagnostics').update({ answers: next, current_step: nextStep, company_name: next.q1 || null, segment: next.q2 || null }).eq('id', diagId);
      setSaved('saved');
    }, 600);
  }

  function set(k: string, v: any) {
    setAnswers(prev => { const next = { ...prev, [k]: v }; persist(next); return next; });
  }

  const cur = STEPS[step];
  const qs = cur.ids.map(id => Q[id]);
  const stepComplete = qs.every(q => isAnswered(q, answers));
  const total = Object.values(Q).filter(q => isAnswered(q, answers)).length;
  const minutesLeft = Math.max(1, Math.round((30 - total) * 0.25));

  function go(i: number) {
    setStep(i); persist(answers, i);
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function finish() {
    const missing = Object.values(Q).filter(q => !isAnswered(q, answers));
    if (missing.length) { setErr(`Faltam ${missing.length} perguntas: ${missing.map(m => m.n).join(', ')}.`); const s = STEPS.findIndex(st => st.ids.includes(missing[0].id)); go(s); return; }
    const log: string[] = ['Respostas validadas'];
    setProcessing([...log]);
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    await wait(500);
    const result = analyze(answers);
    log.push('Economia do negócio e GAP de receita calculados'); setProcessing([...log]); await wait(450);
    log.push('Scores de maturidade e jornada calculados'); setProcessing([...log]); await wait(450);
    log.push('Canais e investimento modelados'); setProcessing([...log]); await wait(450);
    log.push('Plano de ação priorizado'); setProcessing([...log]);
    const { error } = await supabase.from('diagnostics').update({
      answers, status: 'completed', result, overall_score: result.maturity.score, engine_version: ENGINE_VERSION,
      company_name: answers.q1, segment: answers.q2, completed_at: new Date().toISOString(),
    }).eq('id', diagId!);
    if (error) { setProcessing(null); setErr('Erro ao salvar: ' + error.message); return; }
    logAudit('diagnostic_completed', 'diagnostic', diagId!);
    log.push('Diagnóstico salvo'); setProcessing([...log]); await wait(400);
    nav(`/app/d/${diagId}`);
  }

  if (loading) return <Loading />;
  if (processing) return (
    <div className="processing">
      <div>
        <VortexRings />
        <h2 style={{ fontSize: 26 }}>Gerando seu diagnóstico</h2>
        <p className="muted mt8">Cruzando suas respostas com a metodologia Vortex.</p>
        <ul className="steps-log">{processing.map(s => <li key={s} className="ok">{s}</li>)}</ul>
      </div>
    </div>
  );

  return (
    <div className="wizard" ref={topRef}>
      <aside className="wiz-side">
        <Brand small />
        <div>
          <div className="nav-label" style={{ padding: '0 12px 8px' }}>Diagnóstico · {total}/30</div>
          <div className="wiz-steps">
            {STEPS.map((s, i) => {
              const done = s.ids.every(id => isAnswered(Q[id], answers));
              return (
                <button key={s.key} className={`wiz-step ${i === step ? 'cur' : ''} ${done ? 'done' : ''}`} onClick={() => go(i)}>
                  <span className="dot">{done ? '✓' : i + 1}</span>
                  <span>{s.title}<small>{s.ids.length} {s.ids.length > 1 ? 'perguntas' : 'pergunta'}</small></span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="side-foot" style={{ marginTop: 'auto' }}>
          Suas respostas são salvas automaticamente. Você pode sair e continuar depois.
          <br /><button onClick={() => nav('/app')}>Voltar ao painel</button>
        </div>
      </aside>

      <main className="wiz-main">
        <div className="wiz-progress"><i style={{ width: `${(total / 30) * 100}%` }} /></div>
        <div className="wiz-head">
          <span className="eyebrow">Etapa {step + 1} de {STEPS.length} · faltam ~{minutesLeft} min</span>
          <h1>{cur.title}</h1>
          <p>{cur.subtitle}</p>
        </div>
        {err && <div className="error mt16">{err}</div>}
        <div className="qlist">{qs.map(q => <QuestionInput key={q.id} q={q} a={answers} set={set} />)}</div>
      </main>

      <div className="wiz-actions">
        <button className="btn btn-ghost" disabled={step === 0} onClick={() => go(step - 1)} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>Voltar</button>
        <span className="saved">{saved === 'saving' ? 'Salvando…' : saved === 'saved' ? '✓ Salvo automaticamente' : ''}</span>
        {step < STEPS.length - 1
          ? <button className="btn btn-primary" onClick={() => { setErr(''); go(step + 1); }}>{stepComplete ? 'Continuar' : 'Pular por enquanto'}</button>
          : <button className="btn btn-primary" onClick={finish}>Gerar meu diagnóstico</button>}
      </div>
    </div>
  );
}
