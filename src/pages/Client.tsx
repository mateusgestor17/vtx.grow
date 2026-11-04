import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { analyze, Analysis, ENGINE_VERSION } from '../lib/engine';
import { date } from '../lib/format';
import { Shell, NavGroup } from '../components/Shell';
import { Loading, ScoreTag } from '../components/ui';
import { ActionPlan, AnswersView, Bottlenecks, Channels, Communication, FloatingCTA, Goals, Journey, Maturity, Overview } from '../components/Report';

interface DiagRow { id: string; status: string; company_name: string | null; overall_score: number | null; created_at: string; completed_at: string | null; result: Analysis | null; answers: any; engine_version: string | null; progress: Record<string, boolean> | null }

export const SECTIONS: { key: string; label: string; icon: string; title: string }[] = [
  { key: '', label: 'Visão geral', icon: 'home', title: 'Visão geral' },
  { key: 'maturidade', label: 'Maturidade', icon: 'gauge', title: 'Índice de maturidade' },
  { key: 'jornada', label: 'Jornada do consumidor', icon: 'route', title: 'Jornada do consumidor' },
  { key: 'gargalos', label: 'Gargalos', icon: 'target', title: 'Diagnóstico de gargalos' },
  { key: 'comunicacao', label: 'Comunicação', icon: 'message', title: 'Auditoria de comunicação' },
  { key: 'metas', label: 'Metas e investimento', icon: 'money', title: 'Metas, funil reverso e investimento' },
  { key: 'canais', label: 'Canais e captação', icon: 'channels', title: 'Canais e plano de captação' },
  { key: 'plano', label: 'Plano de ação', icon: 'list', title: 'Plano de ação' },
  { key: 'respostas', label: 'Minhas respostas', icon: 'file', title: 'Respostas do diagnóstico' },
];

export function renderSection(key: string, an: Analysis, answers: any, diagId?: string, progress?: Record<string, boolean>, onToggle?: (id: string, v: boolean) => void) {
  switch (key) {
    case 'maturidade': return <Maturity an={an} diagId={diagId} />;
    case 'jornada': return <Journey an={an} diagId={diagId} />;
    case 'gargalos': return <Bottlenecks an={an} />;
    case 'comunicacao': return <Communication an={an} diagId={diagId} />;
    case 'metas': return <Goals an={an} diagId={diagId} />;
    case 'canais': return <Channels an={an} diagId={diagId} />;
    case 'plano': return <ActionPlan an={an} diagId={diagId} progress={progress} onToggle={onToggle} />;
    case 'respostas': return <AnswersView answers={answers} />;
    default: return <Overview an={an} diagId={diagId} />;
  }
}

/** Sempre usa a versão atual do motor (determinístico). Se o resultado salvo é de outra versão, atualiza o snapshot. */
export function useLiveAnalysis(row: { id: string; status: string; answers: any; result: Analysis | null; engine_version: string | null } | null, persist: boolean) {
  const an = useMemo(() => (row ? analyze(row.answers || {}) : null), [row?.id, row?.answers]);
  useEffect(() => {
    if (persist && row && an && row.status === 'completed' && row.engine_version !== ENGINE_VERSION)
      supabase.from('diagnostics').update({ result: an, overall_score: an.maturity.score, engine_version: ENGINE_VERSION }).eq('id', row.id).then(() => {});
  }, [row?.id, an]);
  return an;
}

export function ClientHome() {
  const { session } = useAuth();
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    supabase.from('diagnostics').select('id').eq('user_id', session!.user.id).eq('status', 'completed').order('completed_at', { ascending: false }).limit(1)
      .then(({ data }) => setTarget(data && data[0] ? `/app/d/${data[0].id}` : '/app/questionario'));
  }, [session]);
  return target ? <Navigate to={target} replace /> : <Loading />;
}

function clientNav(id: string, isStaff: boolean): NavGroup[] {
  const g: NavGroup[] = [
    { label: 'Diagnóstico', items: SECTIONS.map(s => ({ to: `/app/d/${id}${s.key ? '/' + s.key : ''}`, label: s.label, icon: s.icon, end: true })) },
    { label: 'Conta', items: [{ to: '/app/historico', label: 'Histórico', icon: 'history' }, { to: '/app/questionario', label: 'Atualizar diagnóstico', icon: 'plus' }] },
  ];
  if (isStaff) g.push({ label: 'Vortex', items: [{ to: '/admin', label: 'Painel admin', icon: 'users' }] });
  return g;
}

export function ClientReport() {
  const { id, section = '' } = useParams();
  const { isStaff } = useAuth();
  const [row, setRow] = useState<DiagRow | null>(null);
  const [missing, setMissing] = useState(false);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  useEffect(() => {
    supabase.from('diagnostics').select('*').eq('id', id!).maybeSingle().then(({ data }) => {
      if (!data || data.status !== 'completed') setMissing(true);
      else { setRow(data as DiagRow); setProgress((data as DiagRow).progress || {}); }
    });
  }, [id]);
  const an = useLiveAnalysis(row, true);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [section]);
  if (missing) return <Navigate to="/app/questionario" replace />;
  if (!row || !an) return <Loading />;
  const sec = SECTIONS.find(s => s.key === section) || SECTIONS[0];
  function toggle(actionId: string, v: boolean) {
    const next = { ...progress, [actionId]: v };
    setProgress(next);
    supabase.from('diagnostics').update({ progress: next }).eq('id', row!.id).then(() => {});
  }
  return (
    <Shell groups={clientNav(row.id, isStaff)} title={sec.title} crumb={`${row.company_name || 'Sua empresa'} · ${date(row.completed_at)}`}
      actions={<Link to="/app/questionario" className="btn btn-ghost btn-sm">Atualizar dados</Link>}>
      {renderSection(sec.key, an, row.answers, row.id, progress, toggle)}
      <FloatingCTA an={an} diagId={row.id} />
    </Shell>
  );
}

export function History() {
  const { session, isStaff } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<DiagRow[] | null>(null);
  useEffect(() => {
    supabase.from('diagnostics').select('id,status,company_name,overall_score,created_at,completed_at').eq('user_id', session!.user.id).order('created_at', { ascending: false })
      .then(({ data }) => setRows((data as DiagRow[]) || []));
  }, [session]);
  if (!rows) return <Loading />;
  const latest = rows.find(r => r.status === 'completed');
  return (
    <Shell groups={latest ? clientNav(latest.id, isStaff) : [{ items: [{ to: '/app/questionario', label: 'Diagnóstico', icon: 'plus' }] }]} title="Histórico de diagnósticos" crumb="Cada atualização gera uma nova versão">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Versão</th><th>Empresa</th><th>Status</th><th className="num">Score</th><th>Data</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.id} className="clickable" onClick={() => nav(r.status === 'completed' ? `/app/d/${r.id}` : '/app/questionario')}>
              <td>V{rows.length - i}</td><td>{r.company_name || '—'}</td>
              <td><span className={`tag ${r.status === 'completed' ? 'green' : 'yellow'}`}>{r.status === 'completed' ? 'Concluído' : 'Em andamento'}</span></td>
              <td className="num">{r.overall_score !== null ? <span className="row" style={{ justifyContent: 'flex-end', gap: 8 }}><b>{r.overall_score}</b><ScoreTag s={r.overall_score} /></span> : '—'}</td><td>{date(r.completed_at || r.created_at)}</td>
            </tr>))}</tbody>
        </table>
      </div>
      <FloatingCTA />
    </Shell>
  );
}
