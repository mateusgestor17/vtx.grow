import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase, logAudit } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { analyze, commercialFit, ENGINE_VERSION, Analysis, STAGE_LABEL } from '../lib/engine';
import { brl, date, dateTime } from '../lib/format';
import { Shell, NavGroup } from '../components/Shell';
import { Loading, ScoreRing, scoreColor } from '../components/ui';
import { SECTIONS, renderSection } from './Client';

const LEAD_STATUS: Record<string, string> = { novo: 'Novo', em_contato: 'Em contato', reuniao_agendada: 'Reunião agendada', proposta: 'Proposta', cliente: 'Cliente', perdido: 'Perdido' };

const adminNav: NavGroup[] = [
  { label: 'Admin Vortex', items: [
    { to: '/admin', label: 'Leads e diagnósticos', icon: 'users', end: true },
    { to: '/admin/auditoria', label: 'Log de auditoria', icon: 'log' },
  ] },
  { label: 'Minha conta', items: [{ to: '/app', label: 'Meu diagnóstico', icon: 'home' }] },
];

interface Row {
  id: string; user_id: string; status: string; company_name: string | null; segment: string | null; overall_score: number | null;
  lead_status: string; created_at: string; completed_at: string | null; cta_clicked_at: string | null; answers: any; result: Analysis | null;
  profiles: { first_name: string | null; last_name: string | null; email: string; phone: string | null } | null;
}

export function AdminLeads() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState('');
  const [st, setSt] = useState('');
  const [onlyDone, setOnlyDone] = useState(false);
  useEffect(() => {
    supabase.from('diagnostics').select('id,user_id,status,company_name,segment,overall_score,lead_status,created_at,completed_at,cta_clicked_at,answers,result,profiles!diagnostics_user_id_fkey(first_name,last_name,email,phone)')
      .order('created_at', { ascending: false }).limit(1000)
      .then(({ data, error }) => { if (error) console.error(error); setRows((data as any) || []); });
  }, []);
  const list = useMemo(() => (rows || []).filter(r => {
    if (onlyDone && r.status !== 'completed') return false;
    if (st && r.lead_status !== st) return false;
    if (!q) return true;
    const s = `${r.company_name} ${r.segment} ${r.profiles?.first_name} ${r.profiles?.last_name} ${r.profiles?.email} ${r.profiles?.phone}`.toLowerCase();
    return s.includes(q.toLowerCase());
  }), [rows, q, st, onlyDone]);
  if (!rows) return <Loading />;
  const done = rows.filter(r => r.status === 'completed');
  const users = new Set(rows.map(r => r.user_id)).size;
  const hot = done.filter(r => r.result && commercialFit(r.answers, r.result).label === 'Quente').length;
  const cta = rows.filter(r => r.cta_clicked_at).length;
  return (
    <Shell groups={adminNav} title="Leads e diagnósticos" crumb="Painel administrativo Vortex">
      <div className="grid g4">
        <div className="card tight kpi"><small>Contas com diagnóstico</small><b>{users}</b></div>
        <div className="card tight kpi"><small>Diagnósticos concluídos</small><b>{done.length}</b><span>{rows.length - done.length} em andamento</span></div>
        <div className="card tight kpi"><small>Leads quentes</small><b>{hot}</b><span>fit comercial ≥ 70</span></div>
        <div className="card tight kpi"><small>Clicaram em "Falar com a Vortex"</small><b>{cta}</b></div>
      </div>
      <div className="row mt24">
        <input className="input" style={{ maxWidth: 360 }} placeholder="Buscar empresa, nome, e-mail, telefone…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="select" style={{ maxWidth: 220 }} value={st} onChange={e => setSt(e.target.value)}>
          <option value="">Todos os status</option>{Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={onlyDone} onChange={e => setOnlyDone(e.target.checked)} /> Só concluídos</label>
      </div>
      <div className="table-wrap rtable mt16">
        <table>
          <thead><tr><th>Empresa</th><th>Contato</th><th>Segmento</th><th className="num">Faturamento</th><th className="num">Meta</th><th className="num">Score</th><th>Fit</th><th>Status</th><th>Data</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={9} className="muted">Nenhum lead encontrado.</td></tr>}
            {list.map(r => {
              const fit = r.result ? commercialFit(r.answers, r.result) : null;
              return (
                <tr key={r.id} className="clickable" onClick={() => nav(`/admin/lead/${r.id}`)}>
                  <td><b>{r.company_name || '—'}</b>{r.status !== 'completed' && <div className="legend">em andamento</div>}</td>
                  <td data-label="Contato"><span>{[r.profiles?.first_name, r.profiles?.last_name].filter(Boolean).join(' ')}<div className="legend">{r.profiles?.phone} · {r.profiles?.email}</div></span></td>
                  <td className="muted" data-label="Segmento">{r.segment === 'Outro' ? r.answers?.q2_other : r.segment || '—'}</td>
                  <td className="num" data-label="Faturamento">{brl(r.result?.financial.currentRevenue ?? (Number(r.answers?.q16) || null))}</td>
                  <td className="num" data-label="Meta">{brl(r.result?.financial.targetRevenue ?? (Number(r.answers?.q17) || null))}</td>
                  <td className="num" data-label="Score">{r.overall_score !== null ? <b style={{ color: scoreColor(r.overall_score) }}>{r.overall_score}</b> : '—'}</td>
                  <td data-label="Fit">{fit ? <span className={`tag ${fit.label === 'Quente' ? 'red' : fit.label === 'Morno' ? 'yellow' : 'gray'}`}>{fit.label} {fit.score}</span> : '—'}</td>
                  <td data-label="Status"><span className="tag">{LEAD_STATUS[r.lead_status]}</span>{r.cta_clicked_at && <div className="legend">clicou no CTA</div>}</td>
                  <td className="muted" data-label="Data">{date(r.completed_at || r.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

export function AdminLead() {
  const { id, tab = 'resumo' } = useParams();
  const { session } = useAuth();
  const nav = useNavigate();
  const [row, setRow] = useState<Row | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [versions, setVersions] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from('diagnostics').select('*,profiles!diagnostics_user_id_fkey(first_name,last_name,email,phone)').eq('id', id!).maybeSingle();
    setRow(data as any);
    if (data) {
      const [{ data: n }, { data: v }] = await Promise.all([
        supabase.from('admin_notes').select('id,note,created_at,profiles(first_name,email)').eq('diagnostic_id', id!).order('created_at', { ascending: false }),
        supabase.from('diagnostics').select('id,status,overall_score,created_at,completed_at').eq('user_id', data.user_id).order('created_at', { ascending: false }),
      ]);
      setNotes(n || []); setVersions(v || []);
    }
  }
  useEffect(() => { load(); logAudit('admin_viewed_lead', 'diagnostic', id); }, [id]);

  // Recalcula com o motor atual (determinístico) — mesmo resultado para as mesmas respostas
  const an = useMemo(() => (row ? analyze(row.answers || {}) : null), [row]);
  if (!row || !an) return <Loading />;
  const fit = commercialFit(row.answers, an);

  async function setStatus(s: string) {
    await supabase.from('diagnostics').update({ lead_status: s }).eq('id', row!.id);
    logAudit('admin_changed_status', 'diagnostic', row!.id, { to: s });
    setRow({ ...row!, lead_status: s });
  }
  async function regenerate() {
    const result = analyze(row!.answers);
    await supabase.from('diagnostics').update({ result, overall_score: result.maturity.score, engine_version: ENGINE_VERSION }).eq('id', row!.id);
    logAudit('admin_regenerated_analysis', 'diagnostic', row!.id);
    load();
  }
  async function addNote(e: FormEvent) {
    e.preventDefault(); if (!note.trim()) return;
    await supabase.from('admin_notes').insert({ diagnostic_id: row!.id, author_id: session!.user.id, note: note.trim() });
    setNote(''); load();
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify({ lead: row!.profiles, answers: row!.answers, analysis: an }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `vtx-grow-${(row!.company_name || 'lead').replace(/\s+/g, '-')}.json`; a.click();
    logAudit('admin_exported_lead', 'diagnostic', row!.id);
  }

  const p = row.profiles;
  const phoneDigits = (p?.phone || '').replace(/\D/g, '');
  const tabs = [{ key: 'resumo', label: 'Resumo comercial' }, { key: 'respostas', label: 'Respostas' }, ...SECTIONS.filter(s => s.key && s.key !== 'respostas').map(s => ({ key: s.key, label: s.label })), { key: 'geral', label: 'Visão do cliente' }];

  return (
    <Shell groups={adminNav} title={row.company_name || 'Lead sem nome'} crumb={`${[p?.first_name, p?.last_name].filter(Boolean).join(' ')} · ${p?.email}`}
      actions={<><button className="btn btn-ghost btn-sm" onClick={exportJson}>Exportar</button><button className="btn btn-ghost btn-sm" onClick={regenerate}>Regenerar análise</button></>}>
      <div className="tabs">{tabs.map(t => <button key={t.key} className={t.key === tab ? 'on' : ''} onClick={() => nav(`/admin/lead/${row.id}/${t.key}`)}>{t.label}</button>)}</div>

      {tab === 'resumo' && (
        <>
          {row.status !== 'completed' && <div className="notice">Diagnóstico ainda em andamento — análise prévia com as respostas até agora.</div>}
          <div className="grid g3 mt16">
            <div className="card row" style={{ gap: 18 }}><ScoreRing value={an.maturity.score} size={100} stroke={9} label="maturidade" /><div><h3>{an.maturity.level}</h3><p className="hint">Gargalo: {STAGE_LABEL[an.mainStage]}</p></div></div>
            <div className="card row" style={{ gap: 18 }}><ScoreRing value={fit.score} size={100} stroke={9} label="fit Vortex" /><div><h3>Lead {fit.label}</h3><p className="hint">Visível só para a Vortex</p></div></div>
            <div className="card">
              <h3>Contato</h3>
              <p className="mt8">{[p?.first_name, p?.last_name].filter(Boolean).join(' ')}</p>
              <p className="muted">{p?.phone}<br />{p?.email}</p>
              {phoneDigits && <a className="btn btn-primary btn-sm mt8" href={`https://wa.me/55${phoneDigits.replace(/^55/, '')}`} target="_blank" rel="noreferrer">Chamar no WhatsApp</a>}
            </div>
          </div>
          <div className="grid g2 mt16">
            <div className="card">
              <h3>Por que esse fit</h3>
              <ul style={{ paddingLeft: 18 }}>{fit.reasons.length ? fit.reasons.map(r => <li key={r}>{r}</li>) : <li className="muted">Sem sinais fortes de fit.</li>}</ul>
              <div className="divider" />
              <h3>Solução recomendada para ofertar</h3>
              <ul style={{ paddingLeft: 18 }}>{an.bottlenecks.slice(0, 3).map(b => <li key={b.id}>{b.todo}</li>)}</ul>
            </div>
            <div className="card">
              <h3>Status comercial</h3>
              <select className="select mt8" value={row.lead_status} onChange={e => setStatus(e.target.value)}>{Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <div className="grid g2 mt16">
                <div className="kpi"><small>Faturamento</small><b style={{ fontSize: 20 }}>{brl(an.financial.currentRevenue)}</b></div>
                <div className="kpi"><small>Meta</small><b style={{ fontSize: 20 }}>{brl(an.financial.targetRevenue)}</b></div>
                <div className="kpi"><small>Investiria</small><b style={{ fontSize: 20 }}>{brl(an.financial.willingness)}</b></div>
                <div className="kpi"><small>Prazo</small><b style={{ fontSize: 20 }}>{an.financial.months} meses</b></div>
              </div>
              <p className="legend mt16">CTA WhatsApp: {row.cta_clicked_at ? `clicado em ${dateTime(row.cta_clicked_at)}` : 'não clicado'}</p>
            </div>
          </div>
          <div className="grid g2 mt16">
            <div className="card">
              <h3>Notas internas</h3>
              <form onSubmit={addNote} className="row mt8" style={{ flexWrap: 'nowrap' }}>
                <input className="input" placeholder="Adicionar nota…" value={note} onChange={e => setNote(e.target.value)} />
                <button className="btn btn-primary">Salvar</button>
              </form>
              {notes.map(n => <div key={n.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}><p>{n.note}</p><p className="legend">{n.profiles?.first_name || n.profiles?.email} · {dateTime(n.created_at)}</p></div>)}
            </div>
            <div className="card">
              <h3>Versões deste lead</h3>
              <table className="mt8"><tbody>{versions.map((v, i) => (
                <tr key={v.id}><td><Link to={`/admin/lead/${v.id}`}>V{versions.length - i}</Link>{v.id === row.id ? ' (atual)' : ''}</td><td>{v.status === 'completed' ? 'Concluído' : 'Em andamento'}</td><td className="num">{v.overall_score ?? '—'}</td><td className="muted">{date(v.completed_at || v.created_at)}</td></tr>
              ))}</tbody></table>
            </div>
          </div>
        </>
      )}
      {tab !== 'resumo' && renderSection(tab === 'geral' ? '' : tab, an, row.answers, undefined, (row as any).progress || {})}
    </Shell>
  );
}

export function AdminAudit() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    supabase.from('audit_log').select('id,action,resource_type,resource_id,details,created_at,profiles(first_name,email)').order('created_at', { ascending: false }).limit(300)
      .then(({ data }) => setRows(data || []));
  }, []);
  if (!rows) return <Loading />;
  return (
    <Shell groups={adminNav} title="Log de auditoria" crumb="Últimos 300 eventos">
      <div className="table-wrap"><table>
        <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Recurso</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id}><td className="muted">{dateTime(r.created_at)}</td><td>{r.profiles?.first_name || r.profiles?.email || '—'}</td><td>{r.action}</td><td className="muted">{r.resource_type} {r.details ? JSON.stringify(r.details) : ''}</td></tr>)}</tbody>
      </table></div>
    </Shell>
  );
}
