import { useState } from 'react';
import { Analysis, PILLAR_LABEL, Pillar, STAGE_LABEL, STAGE_QUESTION, Stage, Phase, maturityLevel, ActionItem } from '../lib/engine';
import { journeyPlaybook } from '../lib/playbook';
import { brl, int, pct } from '../lib/format';
import { Answers, displayAnswer, Q, STEPS } from '../lib/questions';
import { whatsappLink, supabase } from '../lib/supabase';
import { C, ColumnChart, Gauge, Icon, LineChart, PairBars, PriorityTag, ScoreBar, ScoreRing, ScoreTag, Section, priorityColor, scoreColor } from './ui';

const STAGES: Stage[] = ['descoberta', 'atencao', 'consideracao', 'acao', 'relacionamento'];
const PILLARS: Pillar[] = ['marketing', 'vendas', 'tecnologia', 'indicadores'];
const STAGE_SHORT: Record<Stage, string> = { descoberta: 'Descoberta', atencao: 'Atenção', consideracao: 'Consideração', acao: 'Ação', relacionamento: 'Relacionamento' };

function ctaMessage(an: Analysis) {
  return `Olá, Vortex! Fiz o diagnóstico no VTX.GROW.\nEmpresa: ${an.company.name}\nScore de maturidade: ${an.maturity.score}/100\nPrincipal gargalo: ${an.bottlenecks[0]?.title || STAGE_LABEL[an.mainStage]}\nQuero ajuda para executar o plano.`;
}
function markCta(diagId?: string) { if (diagId) supabase.from('diagnostics').update({ cta_clicked_at: new Date().toISOString() }).eq('id', diagId).then(() => {}); }

export function VortexCTA({ an, diagId, title, text }: { an: Analysis; diagId?: string; title?: string; text?: string }) {
  return (
    <div className="cta mt24">
      <div>
        <h3>{title || 'Quer ajuda da Vortex para executar esse plano?'}</h3>
        <p>{text || 'Fale com um especialista e transforme o diagnóstico em resultado, com a jornada completa desenhada e aplicada para sua empresa.'}</p>
      </div>
      <a className="btn" href={whatsappLink(ctaMessage(an))} target="_blank" rel="noreferrer" onClick={() => markCta(diagId)}><Icon name="whatsapp" /> Falar com a Vortex</a>
    </div>
  );
}

export function FloatingCTA({ an, diagId }: { an?: Analysis | null; diagId?: string }) {
  const msg = an ? ctaMessage(an) : 'Olá, Vortex! Estou usando o VTX.GROW e quero falar com um especialista.';
  return (
    <a className="fab" href={whatsappLink(msg)} target="_blank" rel="noreferrer" onClick={() => markCta(diagId)} aria-label="Fale com a Vortex pelo WhatsApp">
      <Icon name="whatsapp" size={24} /><span className="fab-label">Fale com a Vortex</span>
    </a>
  );
}

function Kpi({ icon, color, bg, label, value, sub }: { icon: string; color: string; bg: string; label: string; value: string; sub?: string }) {
  return (
    <div className="card tight kpi-card">
      <div className="kpi-icon" style={{ background: bg, color }}><Icon name={icon} size={20} /></div>
      <div className="kpi"><small>{label}</small><b style={{ color }}>{value}</b>{sub && <span>{sub}</span>}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function Overview({ an, diagId }: { an: Analysis; diagId?: string }) {
  const f = an.financial;
  const top = an.bottlenecks.slice(0, 3);
  const next7 = an.actions.filter(a => a.phase === '7d').slice(0, 5);
  const col = scoreColor(an.maturity.score);
  return (
    <>
      <div className="hero" style={{ ['--hero-tint' as any]: `${col}22` }}>
        <div className="hero-grid">
          <div style={{ textAlign: 'center' }}>
            <Gauge value={an.maturity.score} size={250} label="Maturidade" />
            <div style={{ marginTop: -18 }}><span style={{ fontFamily: 'var(--display)', fontSize: 42, fontWeight: 800, color: col }}>{an.maturity.score}</span><span className="muted"> /100</span></div>
          </div>
          <div>
            <span className="tag" style={{ background: `${col}1f`, color: col }}>Índice de maturidade · {an.maturity.level}</span>
            <h2 style={{ marginTop: 14 }}>{an.company.name} está em {an.maturity.score}/100 de maturidade de crescimento.</h2>
            <p>Principal gargalo na jornada: <b style={{ color: C.red }}>{STAGE_LABEL[an.mainStage]}</b>. {(an.bottlenecks.find(b => b.stage === an.mainStage) || top[0])?.found || ''}</p>
          </div>
          <div className="kpi hero-side">
            <small>Confiabilidade da análise</small>
            <b style={{ color: scoreColor(an.confidence) }}>{an.confidence}%</b>
            <span>{an.assumptions.length} premissa(s) de mercado</span>
          </div>
        </div>
      </div>

      <div className="grid g4 mt16">
        <Kpi icon="money" color={C.blue} bg="var(--b-50)" label="Faturamento atual" value={brl(f.currentRevenue)} sub="média mensal" />
        <Kpi icon="flag" color={C.green} bg="var(--green-bg)" label="Meta" value={brl(f.targetRevenue)} sub={`em ${f.months} meses`} />
        <Kpi icon="trend" color={C.orange} bg="var(--orange-bg)" label="GAP de receita" value={brl(f.gap)} sub={`+${Math.round(f.gapPct * 100)}% · ${int(f.additionalSales)} vendas a mais/mês`} />
        <Kpi icon="bolt" color={C.purple} bg="var(--purple-bg)" label="Investimento necessário" value={brl(f.investmentBase)} sub="por mês (mídia + estrutura)" />
      </div>

      <div className="grid g2 mt16">
        <div className="card">
          <div className="card-head"><div><h3>Quatro pilares</h3><p className="hint">O que precisa funcionar dentro da empresa.</p></div></div>
          <ColumnChart data={PILLARS.map(p => ({ label: PILLAR_LABEL[p], value: an.pillars[p] }))} />
        </div>
        <div className="card">
          <div className="card-head"><div><h3>Jornada do consumidor</h3><p className="hint">Onde isso afeta o seu cliente.</p></div></div>
          <ColumnChart data={STAGES.map(s => ({ label: STAGE_SHORT[s], value: an.journey[s] }))} />
        </div>
      </div>
      <div className="legend-dots mt8"><span><i style={{ background: C.red }} />0–39 Crítico</span><span><i style={{ background: C.orange }} />40–54 Atenção</span><span><i style={{ background: C.yellow }} />55–69 Regular</span><span><i style={{ background: C.green }} />70–100 Bom</span></div>

      <Section title="Os 3 principais gargalos" desc="Onde está a maior perda hoje — em ordem de prioridade.">
        <div className="grid g3">{top.map(b => (
          <div className="card issue" key={b.id} style={{ ['--c' as any]: priorityColor(b.priority) }}>
            <div className="meta"><PriorityTag p={b.priority} /><span className="tag gray">{STAGE_LABEL[b.stage]}</span></div>
            <h3>{b.title}</h3>
            <p className="muted">{b.found}</p>
            <p><b>O que fazer:</b> {b.todo}</p>
          </div>
        ))}</div>
      </Section>

      <div className="grid g2">
        <Section title="Canal recomendado">
          <div className="card accent">
            <h3>{an.channels.headline}</h3>
            <p className="muted mt8">{an.channels.reason}</p>
            <div className="mt16"><ScoreBar label="Google Search" value={an.channels.google} /><ScoreBar label="Meta Ads" value={an.channels.meta} /></div>
          </div>
        </Section>
        <Section title="Próximos 7 dias">
          <div className="card" style={{ borderTop: `4px solid ${C.red}` }}>
            {next7.map((a, i) => <div key={a.id} className="row" style={{ padding: '8px 0', flexWrap: 'nowrap', alignItems: 'flex-start' }}><span className="tag red" style={{ minWidth: 30, justifyContent: 'center' }}>{i + 1}</span><span>{a.title}</span></div>)}
          </div>
        </Section>
      </div>

      <Section title="Oportunidades" desc="Ganhos possíveis identificados nas suas respostas.">
        <div className="grid g3">{an.opportunities.slice(0, 3).map(o => <div className="card" key={o.title} style={{ borderTop: `4px solid ${C.green}` }}><h3>{o.title}</h3><p className="muted mt8">{o.detail}</p></div>)}</div>
      </Section>
      <VortexCTA an={an} diagId={diagId} />
    </>
  );
}

// ---------------------------------------------------------------------------
const PILLAR_DESC: Record<Pillar, string> = {
  marketing: 'Capacidade de ser encontrado, chamar atenção e gerar demanda previsível.',
  vendas: 'Capacidade de transformar contatos em clientes: velocidade, processo, follow-up e conversão.',
  tecnologia: 'Ferramentas que sustentam a operação: CRM, site, rastreamento e automação.',
  indicadores: 'Clareza dos números: margem, ticket, leads, vendas e custo de aquisição.',
};
const LEVELS: [string, string, string][] = [['0–20', 'Crítico', C.red], ['21–40', 'Frágil', C.orange], ['41–60', 'Em estruturação', C.yellow], ['61–80', 'Maduro', '#6cc24a'], ['81–100', 'Avançado', C.green]];
export function Maturity({ an, diagId }: { an: Analysis; diagId?: string }) {
  return (
    <>
      <div className="grid g2">
        <div className="card row" style={{ gap: 24, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}><Gauge value={an.maturity.score} size={220} /><div style={{ marginTop: -14, fontFamily: 'var(--display)', fontSize: 34, fontWeight: 800, color: scoreColor(an.maturity.score) }}>{an.maturity.score}</div></div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <ScoreTag s={an.maturity.score} />
            <h3 style={{ fontSize: 20, marginTop: 12 }}>Índice geral de maturidade</h3>
            <p className="muted mt8">Média ponderada dos 4 pilares — vendas pesa mais. O elo mais fraco (pilar ou etapa da jornada) puxa o índice para baixo, porque um ponto quebrado trava o crescimento inteiro.</p>
          </div>
        </div>
        <div className="card">
          <h3>Crescimento estrutural</h3>
          <p className="hint">Escala de maturidade Vortex</p>
          <div className="mt16">
            {LEVELS.map(([r, l, col]) => {
              const on = l === an.maturity.level;
              return (
                <div key={l} className="row between" style={{ padding: '9px 12px', borderRadius: 10, marginBottom: 4, background: on ? `${col}1a` : 'transparent', border: on ? `1px solid ${col}` : '1px solid transparent' }}>
                  <span className="row" style={{ gap: 10 }}><i style={{ width: 12, height: 12, borderRadius: 4, background: col, display: 'inline-block' }} /><b style={{ fontWeight: on ? 700 : 500 }}>{l}</b>{on && <span className="tag" style={{ background: col, color: '#fff' }}>você está aqui</span>}</span>
                  <span className="muted">{r}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="grid g2 mt16">
        {PILLARS.map(p => {
          const bs = an.bottlenecks.filter(b => b.pillar === p);
          const acts = an.actions.filter(a => a.pillar === p).slice(0, 4);
          return (
            <div className="card" key={p} style={{ borderTop: `4px solid ${scoreColor(an.pillars[p])}` }}>
              <div className="card-head">
                <div><h3>{PILLAR_LABEL[p]}</h3><p className="hint">{PILLAR_DESC[p]}</p><div className="mt8"><span className={`tag`} style={{ background: `${scoreColor(an.pillars[p])}1f`, color: scoreColor(an.pillars[p]) }}>{maturityLevel(an.pillars[p]).level}</span></div></div>
                <ScoreRing value={an.pillars[p]} size={84} stroke={9} />
              </div>
              {bs.length > 0 && <div className="box-list red"><h4>Pontos de atenção</h4><ul>{bs.map(b => <li key={b.id}>{b.title}</li>)}</ul></div>}
              <div className="box-list blue mt8"><h4>Ações recomendadas</h4><ul>{acts.map(a => <li key={a.id}>{a.title}</li>)}</ul></div>
            </div>
          );
        })}
      </div>
      <VortexCTA an={an} diagId={diagId} />
    </>
  );
}

// ---------------------------------------------------------------------------
export function Journey({ an, diagId }: { an: Analysis; diagId?: string }) {
  const pb = journeyPlaybook(an);
  const [open, setOpen] = useState<Stage>(an.mainStage);
  return (
    <>
      <p className="muted" style={{ maxWidth: 780 }}>Nosso trabalho é desenhar e aplicar a jornada de compra do seu consumidor. Veja como está cada etapa e o passo a passo completo para evoluir — começando pelo gargalo.</p>
      <div className="journey mt16">
        {STAGES.map((s, i) => (
          <button key={s} className={`j-step ${s === an.mainStage ? 'weak' : ''}`} style={{ ['--c' as any]: scoreColor(an.journey[s]), textAlign: 'left', cursor: 'pointer', font: 'inherit', outline: open === s ? `2px solid ${C.blue}` : 'none' }} onClick={() => setOpen(s)}>
            <div className="n">ETAPA {i + 1}{s === an.mainStage ? ' · GARGALO' : ''}</div>
            <h4>{STAGE_LABEL[s]}</h4>
            <div className="v" style={{ color: scoreColor(an.journey[s]) }}>{an.journey[s]}<small>/100</small></div>
            <div className="bar mt8"><i style={{ width: `${an.journey[s]}%`, background: scoreColor(an.journey[s]) }} /></div>
          </button>
        ))}
      </div>
      {STAGES.filter(s => s === open).map(s => {
        const p = pb[s];
        const bs = an.bottlenecks.filter(b => b.stage === s);
        const acts = an.actions.filter(a => a.stage === s);
        const i = STAGES.indexOf(s);
        return (
          <Section key={s} title={`${i + 1}. ${STAGE_LABEL[s]}`} desc={STAGE_QUESTION[s]} right={<ScoreTag s={an.journey[s]} />}>
            <div className="card" style={{ borderLeft: `4px solid ${scoreColor(an.journey[s])}` }}>
              <h3>Objetivo da etapa</h3><p className="muted mt8">{p.objective}</p>
            </div>
            <div className="grid g-wide mt16">
              <div className="card">
                <h3>Passo a passo</h3>
                <ol className="steps mt16">{p.steps.map(st => <li key={st.t}><div><b>{st.t}</b>{st.d && <span>{st.d}</span>}</div></li>)}</ol>
              </div>
              <div className="grid" style={{ gap: 12, alignContent: 'start' }}>
                <div className={`box-list ${bs.length ? 'red' : 'green'}`}>
                  <h4>Diagnóstico desta etapa</h4>
                  {bs.length === 0 ? <p style={{ fontSize: 14 }}>Nenhum gargalo crítico identificado com os dados atuais.</p> :
                    <ul>{bs.map(b => <li key={b.id}><b>{b.title}:</b> {b.found}</li>)}</ul>}
                </div>
                <div className="box-list blue"><h4>Indicadores da etapa</h4><ul>{p.kpis.map(k => <li key={k}>{k}</li>)}</ul></div>
                <div className="box-list yellow"><h4>Erros comuns</h4><ul>{p.mistakes.map(k => <li key={k}>{k}</li>)}</ul></div>
                <div className="card tight"><h3 style={{ fontSize: 14 }}>Ferramentas</h3><div className="chips mt8">{p.tools.map(t => <span className="chip" key={t}>{t}</span>)}</div></div>
                {acts.length > 0 && <div className="card tight"><h3 style={{ fontSize: 14 }}>No seu plano de ação</h3><div className="chips mt8">{acts.map(a => <span key={a.id} className="chip" style={{ borderColor: priorityColor(a.priority) }}>{a.title}</span>)}</div></div>}
              </div>
            </div>
          </Section>
        );
      })}
      <VortexCTA an={an} diagId={diagId} title="Quer que a Vortex desenhe e aplique essa jornada?" />
    </>
  );
}

// ---------------------------------------------------------------------------
export function Communication({ an, diagId }: { an: Analysis; diagId?: string }) {
  const c = an.communication;
  const order = ['proposta', 'clareza', 'cta'];
  const vision = c.items.filter(i => order.includes(i.key));
  const channels = c.items.filter(i => !order.includes(i.key));
  return (
    <>
      <div className="hero" style={{ ['--hero-tint' as any]: `${scoreColor(c.score)}22` }}>
        <div className="hero-grid">
          <ScoreRing value={c.score} size={150} label="comunicação" />
          <div>
            <span className="tag" style={{ background: `${scoreColor(c.score)}1f`, color: scoreColor(c.score) }}>Auditoria de comunicação</span>
            <h2 style={{ marginTop: 14 }}>Score de comunicação: {c.score}/100</h2>
            <p>Uma comunicação clara e objetiva reduz o esforço do cliente para entender o que você vende, por que confiar e qual o próximo passo. Isso melhora a experiência do usuário, aumenta a taxa de conversão e reduz o custo de cada cliente conquistado.</p>
          </div>
        </div>
      </div>
      <Section title="Visão geral" desc="Proposta de valor, clareza da mensagem e chamadas à ação.">
        <div className="grid g3">{vision.map(i => <CommCard key={i.key} i={i} />)}</div>
      </Section>
      <Section title="Canais de comunicação" desc="Website, Instagram, WhatsApp, Google e conteúdo.">
        <div className="card mt8"><ColumnChart data={channels.map(i => ({ label: i.label.replace(' / landing page', '').replace(' / conteúdo', ''), value: i.score }))} height={170} /></div>
        <div className="grid g2 mt16">{channels.map(i => <CommCard key={i.key} i={i} />)}</div>
      </Section>
      <p className="legend mt16">Scores estimados a partir das respostas do diagnóstico. Uma auditoria visual completa dos seus canais é feita pelo time Vortex.</p>
      <VortexCTA an={an} diagId={diagId} title="Quer ajuda da Vortex?" text="Nosso time faz a auditoria completa dos seus canais e reescreve sua comunicação para converter mais." />
    </>
  );
}
function CommCard({ i }: { i: Analysis['communication']['items'][number] }) {
  return (
    <div className="card" style={{ borderTop: `4px solid ${scoreColor(i.score)}` }}>
      <div className="card-head"><h3>{i.label}</h3><ScoreTag s={i.score} /></div>
      <ScoreBar label="Score" value={i.score} />
      <p className="muted mt8">{i.tip}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
function MarketRate({ an }: { an: Analysis }) {
  const [mn, typ, mx] = an.market.closeRange;
  const scaleMax = Math.max(mx * 1.6, (an.market.observedClose || 0) * 1.1, 0.05);
  const pos = (v: number) => `${Math.min(100, (v / scaleMax) * 100)}%`;
  const obs = an.market.observedClose;
  return (
    <div className="card">
      <h3>Taxa de conversão: você x mercado</h3>
      <p className="hint">Conversão de lead em venda no segmento {an.company.segment}, para leads de mídia paga.</p>
      <div style={{ position: 'relative', height: 64, marginTop: 26 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 22, height: 12, borderRadius: 99, background: '#edf1f7' }} />
        <div style={{ position: 'absolute', left: pos(mn), width: `calc(${pos(mx)} - ${pos(mn)})`, top: 22, height: 12, borderRadius: 99, background: `linear-gradient(90deg, ${C.yellow}, ${C.green})` }} />
        <div style={{ position: 'absolute', left: pos(typ), top: 0, transform: 'translateX(-50%)', textAlign: 'center' }}><div style={{ fontSize: 11.5, fontWeight: 700, color: C.green }}>mercado {pct(typ)}</div><div style={{ width: 2, height: 40, background: C.green, margin: '2px auto 0' }} /></div>
        {obs !== null && <div style={{ position: 'absolute', left: pos(obs), top: 30, transform: 'translateX(-50%)', textAlign: 'center' }}><div style={{ width: 14, height: 14, borderRadius: '50%', background: C.blue, border: '3px solid #fff', boxShadow: '0 0 0 1px #3d73e8', margin: '0 auto' }} /><div style={{ fontSize: 11.5, fontWeight: 700, color: C.blue, marginTop: 2 }}>você {pct(obs)}</div></div>}
      </div>
      <div className="grid g3 mt16">
        <div className="kpi"><small>Faixa de mercado</small><b style={{ fontSize: 18 }}>{pct(mn)} – {pct(mx)}</b></div>
        <div className="kpi"><small>Sua taxa atual</small><b style={{ fontSize: 18, color: C.blue }}>{obs !== null ? pct(obs) : '—'}</b></div>
        <div className="kpi"><small>Usada no plano</small><b style={{ fontSize: 18, color: C.green }}>{pct(an.financial.closeRate)}</b></div>
      </div>
      <p className="muted mt16" style={{ fontSize: 13.5 }}>Para planejar novos leads de mídia, nunca usamos uma taxa acima da típica do mercado — indicação e clientes antigos convertem mais e distorcem a média.</p>
    </div>
  );
}

function ScenarioTable({ rows, highlight = 'base' }: { rows: Analysis['scenarios']; highlight?: string }) {
  const colors: Record<string, string> = { conservador: C.red, base: C.blue, agressivo: C.green };
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Cenário</th><th className="num">CPL</th><th className="num">Conversão</th><th className="num">Leads</th><th className="num">Vendas</th><th className="num">Mídia</th><th className="num">Estrutura</th><th className="num">Investimento total</th><th className="num">Faturamento</th><th className="num">Lucro bruto</th><th className="num">CAC</th><th className="num">ROAS</th></tr></thead>
        <tbody>{rows.map(s => (
          <tr key={s.key} className={s.key === highlight ? 'hl' : ''}>
            <td><span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><i style={{ width: 10, height: 10, borderRadius: 3, background: colors[s.key], display: 'inline-block' }} /><b>{s.label}</b></span></td>
            <td className="num">{brl(s.cpl)}</td><td className="num">{pct(s.closeRate)}</td><td className="num">{int(s.leads)}</td><td className="num"><b>{int(s.sales)}</b></td>
            <td className="num">{brl(s.media)}</td><td className="num">{brl(s.structure)}</td><td className="num"><b>{brl(s.investment)}</b></td>
            <td className="num">{brl(s.revenue)}</td><td className="num">{brl(s.grossProfit)}</td><td className="num">{s.sales ? brl(s.cac) : '—'}</td><td className="num">{s.roas.toFixed(1)}x</td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}

export function Goals({ an, diagId }: { an: Analysis; diagId?: string }) {
  const f = an.financial;
  const fn = f.funnel;
  const levels = [
    { v: brl(fn.revenue), l: 'faturamento adicional por mês', col: C.green, rate: '' },
    { v: `${int(fn.sales)} vendas`, l: `ticket médio de ${brl(f.ticket)}`, col: '#2fb36f', rate: `fechamento de ${pct(fn.rates.proposalToSale)} dos orçamentos` },
    { v: `${int(fn.proposals)} orçamentos`, l: 'propostas / atendimentos completos', col: C.yellow, rate: `${pct(fn.rates.mqlToProposal)} dos qualificados recebem orçamento` },
    { v: `${int(fn.mql)} qualificados`, l: 'leads com perfil, urgência e orçamento', col: C.orange, rate: `${pct(fn.rates.leadToMql)} dos leads são qualificados` },
    { v: `${int(fn.leads)} leads`, l: `CPL médio de ${brl(f.cplBase)}`, col: C.purple, rate: `${pct(fn.rates.visitToLead)} das visitas viram lead` },
    { v: `${int(fn.visits)} visitas`, l: 'na landing page / perfil', col: C.blue, rate: '' },
  ];
  const months = f.ramp.map(m => `M${m.month}`);
  return (
    <>
      <div className="grid g4">
        <Kpi icon="money" color={C.blue} bg="var(--b-50)" label="Hoje" value={brl(f.currentRevenue)} sub="faturamento médio/mês" />
        <Kpi icon="flag" color={C.green} bg="var(--green-bg)" label="Meta" value={brl(f.targetRevenue)} sub={`em ${f.months} meses`} />
        <Kpi icon="trend" color={C.orange} bg="var(--orange-bg)" label="GAP" value={brl(f.gap)} sub={`${int(f.additionalSales)} vendas a mais por mês`} />
        <Kpi icon="bolt" color={f.feasibility >= 1 ? C.green : f.feasibility >= .7 ? C.yellow : C.red} bg={f.feasibility >= 1 ? 'var(--green-bg)' : f.feasibility >= .7 ? 'var(--yellow-bg)' : 'var(--red-bg)'} label="Disposto a investir" value={brl(f.willingness)} sub={f.investmentBase > 0 ? `${Math.round(f.feasibility * 100)}% do necessário` : 'por mês'} />
      </div>

      <Section title="Funil reverso da meta" desc="De trás para frente: quanto de cada etapa você precisa por mês para fechar o GAP.">
        <div className="grid g-wide">
          <div className="card">
            <div className="funnel">
              {levels.map((lv, i) => (
                <div key={i} style={{ width: '100%', display: 'block', background: 'transparent', padding: 0 }}>
                  <div style={{ width: `${100 - i * 9}%`, margin: '0 auto', background: lv.col, borderRadius: 12, padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, color: '#fff' }}>
                    <b style={{ fontFamily: 'var(--display)', fontSize: 18 }}>{lv.v}</b><small style={{ textAlign: 'right' }}>{lv.l}</small>
                  </div>
                  {lv.rate && <div className="rate" style={{ textAlign: 'center', marginTop: 4 }}>↑ {lv.rate}</div>}
                </div>
              ))}
            </div>
            <div className="card tight mt16" style={{ background: 'var(--purple-bg)', border: 0, boxShadow: 'none' }}>
              <div className="row between"><b>Investimento mensal estimado</b><b style={{ fontFamily: 'var(--display)', fontSize: 20, color: C.purple }}>{brl(f.investmentBase)}</b></div>
              <p className="legend mt8">{brl(f.media)} em mídia + {brl(f.structure)} de estrutura (gestão, criativos e ferramentas). Faixa: {brl(f.investmentRange[0])} a {brl(f.investmentRange[1])}.</p>
            </div>
          </div>
          <div className="grid" style={{ gap: 16, alignContent: 'start' }}>
            <MarketRate an={an} />
            <div className="card">
              <h3>Metas da rotina</h3>
              <p className="hint">Leads e orçamentos novos que o time precisa gerar.</p>
              <div className="grid g3 mt16">
                <div className="kpi"><small>Por mês</small><b style={{ fontSize: 20 }}>{int(fn.leads)}</b><span>{int(fn.proposals)} orçamentos</span></div>
                <div className="kpi"><small>Por semana</small><b style={{ fontSize: 20 }}>{int(Math.ceil(fn.leads / 4.3))}</b><span>{int(Math.ceil(fn.proposals / 4.3))} orçamentos</span></div>
                <div className="kpi"><small>Por dia útil</small><b style={{ fontSize: 20 }}>{int(Math.ceil(fn.leads / 22))}</b><span>{int(Math.ceil(fn.proposals / 22))} orçamento(s)</span></div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Economia da aquisição" desc="Quanto você pode pagar para conquistar um cliente.">
        <div className="grid g2">
          <div className="card">
            <table><tbody>
              <tr><td>Ticket médio</td><td className="num">{brl(f.ticket)}</td></tr>
              <tr><td>Margem {f.marginIsHyp && <span className="tag outline">premissa</span>}</td><td className="num">{f.margin}%</td></tr>
              <tr><td>Lucro bruto por venda</td><td className="num">{brl(f.grossProfitPerSale)}</td></tr>
              <tr><td><b>CAC máximo (1ª venda)</b></td><td className="num"><b style={{ color: C.green }}>{brl(f.maxCac)}</b></td></tr>
              <tr><td>CAC projetado (cenário base)</td><td className="num"><b style={{ color: f.economicsOk ? C.green : C.red }}>{brl(f.cacBase)}</b></td></tr>
              <tr><td>Capacidade de atendimento</td><td className="num">{f.capacity ? `${int(f.capacity)} clientes/mês` : '—'}</td></tr>
              <tr><td>Clientes/mês necessários na meta</td><td className="num" style={{ color: f.capacityOk ? undefined : C.red }}>{int(f.totalSalesNeeded)}</td></tr>
            </tbody></table>
          </div>
          <div className="grid" style={{ gap: 12, alignContent: 'start' }}>
            <div className={`notice ${f.economicsOk ? 'ok' : ''}`} style={f.economicsOk ? undefined : { background: 'var(--red-bg)', borderColor: '#f7c6c8', color: '#b4262b' }}>{f.economicsOk ? `A aquisição se paga na primeira venda: cada cliente custa ≈ ${brl(f.cacBase)} e deixa ≈ ${brl(f.grossProfitPerSale)} de lucro bruto.` : 'O CAC projetado supera o lucro da primeira venda. Priorize conversão, ticket ou recompra antes de escalar.'}</div>
            {!f.capacityOk && <div className="error">A meta exige {int(f.totalSalesNeeded)} clientes/mês, mas a capacidade informada é de {int(f.capacity)}.</div>}
            <div className="notice warn">Os primeiros 2–3 meses são de aprendizado: as campanhas e o comercial ainda estão calibrando. Por isso o investimento é maior no começo (veja a evolução mês a mês).</div>
          </div>
        </div>
      </Section>

      <Section title="Cenários para bater a meta" desc={`Quanto investir por mês para vender +${int(f.additionalSales)} clientes, em três cenários de mercado.`}>
        <ScenarioTable rows={an.scenarios} />
        <div className="card mt16">
          <h3>Investimento x faturamento adicional</h3>
          <PairBars rows={an.scenarios.map(s => ({ label: s.label, a: s.investment, b: s.revenue }))} a={{ name: 'Investimento total/mês', color: C.purple }} b={{ name: 'Faturamento adicional/mês', color: C.green }} fmt={brl} />
        </div>
      </Section>

      {an.budgetScenarios.length > 0 && (
        <Section title={`Com o seu orçamento de ${brl(f.willingness)}/mês`} desc="O que esperar investindo exatamente o valor que você informou.">
          <ScenarioTable rows={an.budgetScenarios} />
          {f.feasibility < 1 && f.gap > 0 && <div className="notice warn mt16">Com {brl(f.willingness)}/mês, o cenário base projeta <b>+{int(f.achievableWithBudget.sales)} vendas</b> (≈ {brl(f.achievableWithBudget.revenue)}/mês) após o período de aprendizado. Para chegar à meta no prazo, aumente o investimento por etapas, estenda o prazo ou eleve a conversão.</div>}
        </Section>
      )}
      <p className="legend mt8">Projeções são cenários matemáticos baseados nos dados informados e em referências de mercado. Não representam garantia de resultado.</p>

      <Section title="Evolução mês a mês" desc="Rampa de crescimento até a meta, considerando a curva de aprendizado.">
        <div className="card">
          <LineChart labels={months} fmt={n => n >= 1000 ? `R$ ${Math.round(n / 1000)}k` : brl(n)}
            series={[{ name: 'Meta de faturamento', color: C.green, values: f.ramp.map(m => m.targetRevenue), area: true }, { name: 'Investimento total', color: C.purple, values: f.ramp.map(m => m.investment) }]} />
        </div>
        <div className="table-wrap mt16">
          <table>
            <thead><tr><th>Mês</th><th className="num">Eficiência</th><th className="num">Meta de faturamento</th><th className="num">Vendas extras</th><th className="num">Leads extras</th><th className="num">Mídia</th><th className="num">Investimento total</th></tr></thead>
            <tbody>{f.ramp.map(m => <tr key={m.month}><td>Mês {m.month}</td><td className="num"><span className={`tag ${m.efficiency < .7 ? 'red' : m.efficiency < 1 ? 'yellow' : 'green'}`}>{Math.round(m.efficiency * 100)}%</span></td><td className="num">{brl(m.targetRevenue)}</td><td className="num">{int(m.extraSales)}</td><td className="num">{int(m.leads)}</td><td className="num">{brl(m.media)}</td><td className="num"><b>{brl(m.investment)}</b></td></tr>)}</tbody>
          </table>
        </div>
      </Section>

      {an.assumptions.length > 0 && (
        <Section title="Premissas utilizadas" desc="Onde faltou dado, usamos referências de mercado declaradas. Atualize com seus números reais para recalcular.">
          <div className="grid g2">{an.assumptions.map(h => <div key={h.label} className="card tight" style={{ borderLeft: `4px solid ${C.yellow}` }}><div className="row between"><b>{h.label}</b><span className="tag yellow">{h.value}</span></div><p className="muted mt8" style={{ fontSize: 14 }}>{h.reason}</p></div>)}</div>
        </Section>
      )}
      <VortexCTA an={an} diagId={diagId} title="Quer bater essa meta com a Vortex?" />
    </>
  );
}

// ---------------------------------------------------------------------------
export function Channels({ an, diagId }: { an: Analysis; diagId?: string }) {
  const c = an.channels;
  const recLabel = c.recommendation === 'FIX_FOUNDATION_FIRST' ? 'Fundação primeiro' : c.recommendation === 'BOTH' ? 'Google + Meta' : c.recommendation === 'GOOGLE_FIRST' ? 'Google primeiro' : 'Meta primeiro';
  return (
    <>
      <div className="grid g3">
        <div className="card row" style={{ gap: 18, borderTop: `4px solid ${scoreColor(c.google)}` }}><ScoreRing value={c.google} size={96} stroke={9} label="fit" /><div><h3>Google Search</h3><p className="hint">Demanda ativa, urgência, intenção.</p></div></div>
        <div className="card row" style={{ gap: 18, borderTop: `4px solid ${scoreColor(c.meta)}` }}><ScoreRing value={c.meta} size={96} stroke={9} label="fit" /><div><h3>Meta Ads</h3><p className="hint">Potencial visual, público, geração de demanda.</p></div></div>
        <div className="card row" style={{ gap: 18, borderTop: `4px solid ${scoreColor(c.commercialCapacity)}` }}><ScoreRing value={c.commercialCapacity} size={96} stroke={9} label="score" /><div><h3>Capacidade comercial</h3><p className="hint">O comercial consegue absorver mais leads?</p></div></div>
      </div>
      <Section title="Recomendação">
        <div className="card" style={{ borderLeft: `4px solid ${c.recommendation === 'FIX_FOUNDATION_FIRST' ? C.red : C.green}` }}>
          <span className={`tag ${c.recommendation === 'FIX_FOUNDATION_FIRST' ? 'red' : 'green'}`}>{recLabel}</span>
          <h3 style={{ fontSize: 20, marginTop: 12 }}>{c.headline}</h3>
          <p className="muted mt8" style={{ maxWidth: 820 }}>{c.reason}</p>
          <p className="mt8"><b>{c.phase2}</b></p>
          {c.recommendation !== 'FIX_FOUNDATION_FIRST' && (c.split.google + c.split.meta) > 0 && (
            <>
              <div className="mt16" style={{ display: 'flex', height: 18, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${(c.split.google / (c.split.google + c.split.meta)) * 100}%`, background: C.blue }} />
                <div style={{ flex: 1, background: C.purple }} />
              </div>
              <div className="grid g2 mt16">
                <Kpi icon="target" color={C.blue} bg="var(--b-50)" label="Google Ads (mídia)" value={brl(c.split.google)} sub="por mês, sugestão inicial" />
                <Kpi icon="target" color={C.purple} bg="var(--purple-bg)" label="Meta Ads (mídia)" value={brl(c.split.meta)} sub="por mês, sugestão inicial" />
              </div>
            </>
          )}
        </div>
      </Section>
      <div className="grid g2">
        <Section title="Plano de captação" desc={`Oferta foco: ${an.company.priorityOffer}`}>
          <div className="card">
            <ol className="steps">
              {[
                ['Oferta', `Promessa clara de "${an.company.priorityOffer}" com diferencial, condição e garantia.`],
                ['Landing page dedicada', 'Uma página só para essa oferta, com prova social, FAQ e formulário.'],
                ['Campanha', 'No canal recomendado, com orçamento de teste e rastreamento configurado.'],
                ['Criativos', '3 a 5 variações por semana testando ângulos diferentes.'],
                ['Qualificação', 'Formulário com urgência, orçamento e decisor; atendimento em até 5 minutos.'],
                ['Follow-up', 'Cadência de 15 dias e remarketing para quem não comprou.'],
                ['Medição', 'Toda semana: CPL, leads qualificados, orçamentos, vendas e CAC.'],
              ].map(([t, d]) => <li key={t}><div><b>{t}</b><span>{d}</span></div></li>)}
            </ol>
            <div className="divider" />
            <div className="legend">Ferramentas sugeridas</div>
            <div className="chips mt8">{['WordPress + Elementor', 'Framer', 'Google Ads', 'Meta Ads', 'GA4 + GTM', 'Meta Pixel + CAPI', 'WhatsApp Business'].map(t => <span key={t} className="chip">{t}</span>)}</div>
          </div>
        </Section>
        <Section title="Formulário de qualificação" desc="Perguntas sugeridas para separar curiosos de compradores.">
          <div className="card">
            <ol className="steps">{an.qualificationForm.map(q => <li key={q}><div><b style={{ fontWeight: 500 }}>{q}</b></div></li>)}</ol>
            <div className="divider" />
            <div className="grid g3">
              <div className="box-list red"><h4>Quente</h4><p style={{ fontSize: 13 }}>Urgente + orçamento compatível → ligação em 5 min.</p></div>
              <div className="box-list yellow"><h4>Morno</h4><p style={{ fontSize: 13 }}>Falta 1 critério → WhatsApp no mesmo dia.</p></div>
              <div className="box-list blue"><h4>Frio</h4><p style={{ fontSize: 13 }}>Só pesquisando → nutrição e remarketing.</p></div>
            </div>
          </div>
        </Section>
      </div>
      <VortexCTA an={an} diagId={diagId} title="Quer que a Vortex monte e gerencie suas campanhas?" />
    </>
  );
}

// ---------------------------------------------------------------------------
const PHASES: { k: Phase; l: string; q: string; col: string }[] = [
  { k: '7d', l: '7 dias', q: 'O que precisa ser corrigido imediatamente.', col: C.red },
  { k: '30d', l: '30 dias', q: 'Construir a fundação: site, campanhas, processo.', col: C.orange },
  { k: '90d', l: '90 dias', q: 'Validar, otimizar e escalar.', col: C.yellow },
  { k: '12m', l: '12 meses', q: 'Eficiência, retenção e LTV.', col: C.green },
];
function ActionCard({ a, i, done, onToggle, defaultOpen }: { a: ActionItem; i: number; done: boolean; onToggle?: (id: string, v: boolean) => void; defaultOpen?: boolean }) {
  return (
    <details className={`action ${done ? 'done' : ''}`} open={defaultOpen} style={{ ['--c' as any]: priorityColor(a.priority) }}>
      <summary>
        <span className="idx">{done ? '✓' : i + 1}</span>
        <div><div className="ttl">{a.title}</div><div className="sub">{STAGE_LABEL[a.stage]} · {PILLAR_LABEL[a.pillar]} · Responsável: {a.owner}</div></div>
        <PriorityTag p={a.priority} />
      </summary>
      <div className="body">
        <p className="muted"><b style={{ color: 'var(--text)' }}>Por que fazer:</b> {a.reason}</p>
        <div className="meta-grid">
          <div><small>Prazo de execução</small><b>{a.time}</b></div>
          <div><small>Custo estimado</small><b>{a.cost}</b></div>
          <div><small>Indicador</small><b>{a.kpi}</b></div>
          <div><small>Impacto / Esforço</small><b><span style={{ color: C.green }}>{a.impact}/10</span> · <span style={{ color: C.orange }}>{a.effort}/10</span></b></div>
        </div>
        <div>
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Como fazer — passo a passo</h3>
          <ol className="steps">{a.steps.map(s => <li key={s.t}><div><b>{s.t}</b>{s.d && <span>{s.d}</span>}</div></li>)}</ol>
        </div>
        <div className="grid g2">
          <div className="box-list green"><h4>Entregáveis</h4><ul>{a.deliverables.map(d => <li key={d}>{d}</li>)}</ul></div>
          {a.mistakes && a.mistakes.length > 0 ? <div className="box-list red"><h4>Evite</h4><ul>{a.mistakes.map(d => <li key={d}>{d}</li>)}</ul></div> : <div />}
        </div>
        {a.tools && <div><div className="legend">Ferramentas</div><div className="chips mt8">{a.tools.map(t => <span key={t} className="chip">{t}</span>)}</div></div>}
        {onToggle && <label className="done-toggle"><input type="checkbox" checked={done} onChange={e => onToggle(a.id, e.target.checked)} /> Marcar como concluída</label>}
      </div>
    </details>
  );
}
export function ActionPlan({ an, diagId, progress = {}, onToggle }: { an: Analysis; diagId?: string; progress?: Record<string, boolean>; onToggle?: (id: string, v: boolean) => void }) {
  const [ph, setPh] = useState<Phase>('7d');
  const list = an.actions.filter(a => a.phase === ph);
  const cur = PHASES.find(p => p.k === ph)!;
  const doneCount = an.actions.filter(a => progress[a.id]).length;
  const pctDone = Math.round((doneCount / Math.max(an.actions.length, 1)) * 100);
  return (
    <>
      <div className="card progress-card">
        <ScoreRing value={pctDone} size={72} stroke={8} label="feito" color={pctDone >= 70 ? C.green : pctDone >= 30 ? C.yellow : C.blue} />
        <div style={{ flex: 1 }}>
          <h3>Progresso do plano</h3>
          <p className="hint">{doneCount} de {an.actions.length} ações concluídas{onToggle ? ' — marque cada ação ao terminar.' : '.'}</p>
          <div className="bar mt8" style={{ height: 12 }}><i style={{ width: `${pctDone}%`, background: `linear-gradient(90deg, ${C.blue}, ${C.green})` }} /></div>
        </div>
      </div>
      <div className="card mt16">
        <h3>O que eu faria primeiro se essa empresa fosse minha?</h3>
        <div className="grid g3 mt16">{an.actions.slice(0, 3).map((a, i) => (
          <div key={a.id} className="card tight" style={{ borderTop: `4px solid ${priorityColor(a.priority)}` }}><div className="row between"><span className="legend">Prioridade {i + 1}</span><PriorityTag p={a.priority} /></div><b className="mt8" style={{ display: 'block' }}>{a.title}</b><p className="muted mt8" style={{ fontSize: 13.5 }}>{a.reason}</p></div>
        ))}</div>
      </div>
      <Section title="Plano de ação" desc={cur.q}>
        <div className="phase-tabs">{PHASES.map(p => {
          const n = an.actions.filter(a => a.phase === p.k).length;
          const d = an.actions.filter(a => a.phase === p.k && progress[a.id]).length;
          return <button key={p.k} className={p.k === ph ? 'on' : ''} style={p.k === ph ? { background: p.col, borderColor: p.col } : { borderLeft: `4px solid ${p.col}` }} onClick={() => setPh(p.k)}>{p.l} · {d}/{n}</button>;
        })}</div>
        <div className="grid" style={{ gap: 10 }}>
          {list.map((a, i) => <ActionCard key={a.id} a={a} i={i} done={!!progress[a.id]} onToggle={onToggle} defaultOpen={i === 0} />)}
        </div>
      </Section>
      <Section title="Roadmap de 12 meses" desc="Fundação → Validação → Escala → Eficiência → Retenção">
        <div className="journey">{an.roadmap.map((r, i) => (
          <div key={r.phase} className="j-step" style={{ ['--c' as any]: [C.red, C.orange, C.yellow, C.blue, C.green][i] }}><div className="n">{r.months.toUpperCase()}</div><h4>{i + 1}. {r.phase}</h4><p className="muted" style={{ fontSize: 13.5 }}>{r.focus}</p>
            <ul style={{ margin: '10px 0 0', paddingLeft: 16, fontSize: 13.5 }}>{r.items.map(x => <li key={x}>{x}</li>)}</ul></div>
        ))}</div>
      </Section>
      <Section title="Indicadores para acompanhar" desc="Só os números que realmente importam para o seu plano.">
        <div className="table-wrap"><table><thead><tr><th>Indicador</th><th>Por quê</th><th>Referência</th></tr></thead>
          <tbody>{an.kpis.map(k => <tr key={k.name}><td><b>{k.name}</b></td><td className="muted">{k.why}</td><td>{k.target}</td></tr>)}</tbody></table></div>
      </Section>
      <VortexCTA an={an} diagId={diagId} />
    </>
  );
}

// ---------------------------------------------------------------------------
export function AnswersView({ answers }: { answers: Answers }) {
  return (
    <div className="grid" style={{ gap: 16 }}>
      {STEPS.map(s => (
        <div className="card" key={s.key}>
          <h3>{s.title}</h3>
          <div className="mt8">{s.ids.map(id => (
            <div className="qa" key={id}><span className="n">{Q[id].n}</span><span className="q">{Q[id].label}</span><span className="a">{displayAnswer(Q[id], answers)}</span></div>
          ))}</div>
        </div>
      ))}
    </div>
  );
}

export function Bottlenecks({ an }: { an: Analysis }) {
  return (
    <div className="grid" style={{ gap: 12 }}>
      {an.bottlenecks.map(b => (
        <div className="card issue" key={b.id} style={{ ['--c' as any]: priorityColor(b.priority) }}>
          <div className="meta"><PriorityTag p={b.priority} /><span className="tag gray">{STAGE_LABEL[b.stage]}</span><span className="tag gray">{PILLAR_LABEL[b.pillar]}</span><span className={`tag ${b.confidence === 'Alta' ? 'green' : b.confidence === 'Média' ? 'yellow' : 'orange'}`}>Confiança {b.confidence}</span></div>
          <h3>{b.title}</h3>
          <dl>
            <dt>O que encontramos</dt><dd>{b.found}</dd>
            <dt>Evidência</dt><dd>{b.evidence}</dd>
            <dt>Impacto provável</dt><dd>{b.impact}</dd>
            <dt>Por que importa</dt><dd>{b.why}</dd>
            <dt>O que fazer</dt><dd><b>{b.todo}</b></dd>
          </dl>
        </div>
      ))}
    </div>
  );
}
