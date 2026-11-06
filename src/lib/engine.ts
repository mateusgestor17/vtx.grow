// ============================================================================
// VTX.GROW — Motor determinístico de diagnóstico
// Todos os números são calculados aqui, a partir das respostas. Nada de "feeling".
// Cada dado carrega sua origem: informado, calculado ou referência de mercado.
// ============================================================================
import { Answers, UNKNOWN, NONE } from './questions';

export const ENGINE_VERSION = '2.1.0';

// ---------------------------------------------------------------------------
// Referências de mercado por segmento — leads vindos de mídia paga.
// close: [mínimo, típico, máximo] de conversão LEAD → VENDA.
//   (leads de indicação convertem muito mais; por isso, para planejar mídia,
//    nunca usamos uma taxa acima da típica do mercado.)
// cpl: faixa de custo por lead em R$.
// searchIntent / visual / urgency / b2b: características que definem o canal.
// ---------------------------------------------------------------------------
interface SegRef { searchIntent: number; visual: number; urgency: number; cpl: [number, number]; close: [number, number, number]; b2b: number }
const SEG: Record<string, SegRef> = {
  'Saúde / Clínica médica':                  { searchIntent: .85, visual: .5,  urgency: .7,  cpl: [25, 70],  close: [.08, .12, .18], b2b: 0 },
  'Odontologia':                             { searchIntent: .8,  visual: .75, urgency: .6,  cpl: [20, 60],  close: [.06, .10, .15], b2b: 0 },
  'Estética e beleza':                       { searchIntent: .55, visual: .95, urgency: .3,  cpl: [10, 35],  close: [.08, .12, .20], b2b: 0 },
  'Advocacia / Jurídico':                    { searchIntent: .9,  visual: .3,  urgency: .8,  cpl: [30, 100], close: [.05, .10, .15], b2b: .3 },
  'Contabilidade / Financeiro':              { searchIntent: .75, visual: .3,  urgency: .4,  cpl: [40, 120], close: [.05, .10, .15], b2b: .8 },
  'Imobiliária / Construtora':               { searchIntent: .6,  visual: .9,  urgency: .3,  cpl: [20, 80],  close: [.005, .015, .03], b2b: 0 },
  'Reformas e construção':                   { searchIntent: .8,  visual: .8,  urgency: .6,  cpl: [25, 80],  close: [.08, .12, .20], b2b: .2 },
  'Esquadrias, vidraçaria e serralheria':    { searchIntent: .85, visual: .8,  urgency: .55, cpl: [30, 80],  close: [.15, .20, .30], b2b: .2 },
  'Móveis planejados / marcenaria':          { searchIntent: .7,  visual: .95, urgency: .3,  cpl: [25, 70],  close: [.08, .12, .18], b2b: .1 },
  'Energia solar':                           { searchIntent: .7,  visual: .6,  urgency: .3,  cpl: [30, 90],  close: [.05, .08, .12], b2b: .3 },
  'Serviços residenciais (desentupidora, dedetização, etc.)': { searchIntent: .95, visual: .5, urgency: .95, cpl: [15, 45], close: [.20, .30, .40], b2b: .1 },
  'Educação / Cursos':                       { searchIntent: .55, visual: .75, urgency: .3,  cpl: [8, 35],   close: [.02, .05, .10], b2b: 0 },
  'Varejo / Loja física':                    { searchIntent: .5,  visual: .85, urgency: .4,  cpl: [5, 25],   close: [.10, .15, .25], b2b: 0 },
  'E-commerce':                              { searchIntent: .6,  visual: .9,  urgency: .5,  cpl: [4, 15],   close: [.03, .06, .10], b2b: 0 },
  'Alimentação / Restaurante':               { searchIntent: .5,  visual: .95, urgency: .7,  cpl: [3, 12],   close: [.20, .30, .45], b2b: 0 },
  'Automotivo':                              { searchIntent: .75, visual: .7,  urgency: .7,  cpl: [15, 45],  close: [.10, .15, .25], b2b: .1 },
  'Pet':                                     { searchIntent: .7,  visual: .85, urgency: .6,  cpl: [8, 30],   close: [.15, .22, .30], b2b: 0 },
  'Fitness / Academia':                      { searchIntent: .55, visual: .9,  urgency: .4,  cpl: [8, 25],   close: [.10, .15, .25], b2b: 0 },
  'Tecnologia / SaaS / Software':            { searchIntent: .6,  visual: .5,  urgency: .3,  cpl: [40, 150], close: [.02, .05, .10], b2b: .9 },
  'Indústria / Distribuição':                { searchIntent: .6,  visual: .4,  urgency: .3,  cpl: [50, 180], close: [.03, .07, .12], b2b: 1 },
  'Consultoria / Serviços B2B':              { searchIntent: .55, visual: .45, urgency: .3,  cpl: [40, 150], close: [.03, .07, .12], b2b: 1 },
  'Turismo / Eventos':                       { searchIntent: .6,  visual: .9,  urgency: .4,  cpl: [12, 45],  close: [.05, .10, .15], b2b: .2 },
  'Outro':                                   { searchIntent: .6,  visual: .6,  urgency: .5,  cpl: [20, 70],  close: [.05, .10, .15], b2b: .3 },
};
const SEG_ALIAS: Record<string, string> = {
  'Esquadrias de alumínio': 'Esquadrias, vidraçaria e serralheria',
  'Vidraçaria': 'Esquadrias, vidraçaria e serralheria',
  'Esquadrias e vidraçaria': 'Esquadrias, vidraçaria e serralheria',
  'Box e espelhos': 'Esquadrias, vidraçaria e serralheria',
  'Serralheria com vidro': 'Esquadrias, vidraçaria e serralheria',
  'Serviços residenciais (desentupidora, vidraçaria, etc.)': 'Serviços residenciais (desentupidora, dedetização, etc.)',
};

/** Quando o segmento é "Outro", tenta reconhecer o mercado pelo texto digitado. */
const SEG_KEYWORDS: [RegExp, string][] = [
  [/esquadri|vidra[cç]|serralh|alum[ií]nio|box|janela|porta|guarda.?corpo/i, 'Esquadrias, vidraçaria e serralheria'],
  [/planejad|marcenar|m[oó]ve(l|is)|cozinha/i, 'Móveis planejados / marcenaria'],
  [/solar|fotovolt|energia/i, 'Energia solar'],
  [/desentup|dedetiz|limpeza|chaveir|eletricist|encanad|ar.?condicionado|climatiz/i, 'Serviços residenciais (desentupidora, dedetização, etc.)'],
  [/reforma|constru|pintur|gesso|piso|telhad|arquitet/i, 'Reformas e construção'],
  [/odonto|dentist|implante|ortodon/i, 'Odontologia'],
  [/est[eé]tic|beleza|sal[aã]o|cabel|unha|depila|harmoniza/i, 'Estética e beleza'],
  [/cl[ií]nica|m[eé]dic|sa[uú]de|fisio|psic|nutri/i, 'Saúde / Clínica médica'],
  [/advoca|jur[ií]dic|direito/i, 'Advocacia / Jurídico'],
  [/contab|financ|seguro|cr[eé]dito|cons[oó]rcio/i, 'Contabilidade / Financeiro'],
  [/im[oó]ve|imobili|loteament|incorpora/i, 'Imobiliária / Construtora'],
  [/curso|escola|educa|treinament|idioma/i, 'Educação / Cursos'],
  [/restaurant|aliment|lanchon|pizz|hamburg|delivery|padaria|confeit/i, 'Alimentação / Restaurante'],
  [/auto|carro|ve[ií]cul|oficina|funilar|moto/i, 'Automotivo'],
  [/pet|veterin|banho e tosa/i, 'Pet'],
  [/academia|fitness|crossfit|pilates|personal/i, 'Fitness / Academia'],
  [/software|saas|tecnolog|sistema|app/i, 'Tecnologia / SaaS / Software'],
  [/ind[uú]stri|f[aá]brica|distribu|atacad/i, 'Indústria / Distribuição'],
  [/consultor|ag[eê]ncia|marketing|b2b/i, 'Consultoria / Serviços B2B'],
  [/loja|varejo|com[eé]rcio/i, 'Varejo / Loja física'],
  [/e-?commerce|loja virtual|online/i, 'E-commerce'],
  [/turism|viage|evento|festa|buffet/i, 'Turismo / Eventos'],
];
function inferSegment(text: string): string {
  for (const [re, seg] of SEG_KEYWORDS) if (re.test(text)) return seg;
  return 'Outro';
}

export type Source = 'informado' | 'calculado' | 'hipotese';
export type Stage = 'descoberta' | 'atencao' | 'consideracao' | 'acao' | 'relacionamento';
export type Pillar = 'marketing' | 'vendas' | 'tecnologia' | 'indicadores';
export type Priority = 'CRÍTICA' | 'ALTA' | 'MÉDIA' | 'BAIXA';
export type Phase = '7d' | '30d' | '90d' | '12m';

export const STAGE_LABEL: Record<Stage, string> = {
  descoberta: 'Descoberta', atencao: 'Atenção', consideracao: 'Consideração', acao: 'Ação (Vendas)', relacionamento: 'Relacionamento',
};
export const STAGE_QUESTION: Record<Stage, string> = {
  descoberta: 'O mercado consegue encontrar e perceber a sua empresa?',
  atencao: 'Sua empresa consegue chamar atenção e gerar demanda?',
  consideracao: 'Existe confiança suficiente para o cliente avançar?',
  acao: 'O processo comercial transforma interesse em receita?',
  relacionamento: 'A empresa encanta, gera recompra e indicação?',
};
export const PILLAR_LABEL: Record<Pillar, string> = { marketing: 'Marketing', vendas: 'Vendas', tecnologia: 'Tecnologia', indicadores: 'Indicadores' };

export interface Bottleneck {
  id: string; title: string; found: string; evidence: string; impact: string; why: string; todo: string;
  severity: number; priority: Priority; stage: Stage; pillar: Pillar; confidence: 'Alta' | 'Média' | 'Baixa';
}
export interface Step { t: string; d?: string }
export interface ActionItem {
  id: string; title: string; reason: string; stage: Stage; pillar: Pillar; phase: Phase; priority: Priority;
  impact: number; effort: number; urgency: number; score: number; owner: string; kpi: string;
  time: string; cost: string; steps: Step[]; deliverables: string[]; tools?: string[]; mistakes?: string[];
}
export interface Scenario {
  key: 'conservador' | 'base' | 'agressivo'; label: string; cpl: number; closeRate: number;
  leads: number; sales: number; media: number; structure: number; investment: number; revenue: number; grossProfit: number; cac: number; roas: number; profitReturn: number;
}
export interface CommItem { key: string; label: string; score: number; status: string; tip: string }

export interface Analysis {
  engineVersion: string;
  generatedAt: string;
  company: { name: string; segment: string; city: string; scope: string; priorityOffer: string; age: string };
  confidence: number;
  assumptions: { label: string; value: string; reason: string }[];
  maturity: { score: number; level: string; levelKey: string };
  pillars: Record<Pillar, number>;
  journey: Record<Stage, number>;
  mainStage: Stage;
  mainPillar: Pillar;
  market: { closeRange: [number, number, number]; cplRange: [number, number]; observedClose: number | null };
  financial: {
    currentRevenue: number; targetRevenue: number; gap: number; gapPct: number; months: number;
    ticket: number; margin: number; marginIsHyp: boolean; grossProfitPerSale: number;
    currentSales: number | null; additionalSales: number; totalSalesNeeded: number; capacity: number; capacityOk: boolean;
    currentLeads: number | null; closeRate: number; closeIsHyp: boolean; requiredLeads: number; totalLeadsNeeded: number;
    cplBase: number; cplIsHyp: boolean; cplRange: [number, number];
    media: number; structure: number; investmentBase: number; investmentRange: [number, number];
    willingness: number; feasibility: number;
    cacBase: number; maxCac: number; economicsOk: boolean; currentMkt: number; currentCpl: number | null;
    achievableWithBudget: { leads: number; sales: number; revenue: number; media: number; structure: number };
    funnel: { revenue: number; sales: number; proposals: number; mql: number; leads: number; visits: number; media: number;
      rates: { visitToLead: number; leadToMql: number; mqlToProposal: number; proposalToSale: number } };
    ramp: { month: number; efficiency: number; targetRevenue: number; extraSales: number; leads: number; media: number; investment: number }[];
  };
  scenarios: Scenario[];
  budgetScenarios: Scenario[];
  channels: {
    google: number; meta: number; commercialCapacity: number;
    recommendation: 'GOOGLE_FIRST' | 'META_FIRST' | 'BOTH' | 'FIX_FOUNDATION_FIRST';
    headline: string; reason: string; split: { google: number; meta: number }; phase2: string;
  };
  communication: { score: number; items: CommItem[] };
  bottlenecks: Bottleneck[];
  opportunities: { title: string; detail: string }[];
  actions: ActionItem[];
  roadmap: { phase: string; months: string; focus: string; items: string[] }[];
  kpis: { name: string; why: string; target: string }[];
  qualificationForm: string[];
}

// ---------------------------------------------------------------------------
const num = (v: any): number | null => (v === undefined || v === null || v === '' || v === UNKNOWN || v === NONE || isNaN(Number(v)) ? null : Number(v));
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const r = Math.round;
const r50 = (x: number) => Math.round(x / 50) * 50;
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export function maturityLevel(s: number): { level: string; key: string } {
  if (s <= 20) return { level: 'Crítico', key: 'critico' };
  if (s <= 40) return { level: 'Frágil', key: 'fragil' };
  if (s <= 60) return { level: 'Em estruturação', key: 'estruturacao' };
  if (s <= 80) return { level: 'Maduro', key: 'maduro' };
  return { level: 'Avançado', key: 'avancado' };
}
function priorityOf(severity: number): Priority {
  if (severity >= 85) return 'CRÍTICA';
  if (severity >= 70) return 'ALTA';
  if (severity >= 50) return 'MÉDIA';
  return 'BAIXA';
}
/** Custo de estrutura: gestão de tráfego, criativos e ferramentas (estimativa). */
const structureFor = (media: number) => (media <= 0 ? 0 : r50(clamp(media * 0.3, 1000, 6000)));
const MIN_MEDIA = 1500; // abaixo disso as plataformas não saem da fase de aprendizado
const LEARNING = [0.5, 0.75, 0.9]; // eficiência dos primeiros meses de campanha

// ============================================================================
export function analyze(a: Answers): Analysis {
  const assumptions: Analysis['assumptions'] = [];
  let unknowns = 0;

  const segKey = a.q2 === 'Outro' ? inferSegment(a.q2_other || '') : (SEG_ALIAS[a.q2] || a.q2);
  const segment: string = a.q2 === 'Outro' ? (a.q2_other || 'Outro') : (a.q2 || 'Outro');
  const ref = SEG[segKey] || SEG['Outro'];
  const scope: string = a.q4 || 'Apenas minha cidade';
  const isLocal = scope === 'Apenas minha cidade' || scope === 'Minha região';
  const city: string = a.q3_city ? `${a.q3_city} - ${a.q3_uf}` : '';
  const cityName: string = a.q3_city || 'sua cidade';
  const priorityOffer: string = (a.q11 || a.q9 || 'seu serviço principal').trim();
  const offerLow = priorityOffer.toLowerCase();
  const sources: string[] = Array.isArray(a.q21) ? a.q21 : [];
  const mainChannel: string = a.q22 || '';

  const hasSite = !!a.q5 && a.q5 !== NONE;
  const hasInsta = !!a.q6 && a.q6 !== NONE;
  const ageMap: Record<string, number> = { 'Menos de 1 ano': .1, '1 a 3 anos': .35, '3 a 5 anos': .6, '5 a 10 anos': .8, 'Mais de 10 anos': 1 };
  const age = ageMap[a.q7] ?? .4;
  const adsMap: Record<string, number> = { 'Nunca utilizei': 0, 'Já utilizei, mas parei': .3, 'Uso Meta Ads': .7, 'Uso Google Ads': .7, 'Uso os dois': 1 };
  const ads = adsMap[a.q24] ?? 0;
  const usesMetaAds = a.q24 === 'Uso Meta Ads' || a.q24 === 'Uso os dois';
  const respMap: Record<string, number> = { 'Menos de 5 minutos': 1, 'Até 1 hora': .8, 'Até 4 horas': .55, 'No mesmo dia': .4, 'Até 24 horas': .25, 'Mais de 24 horas': .05, 'Não sei': .2 };
  const resp = respMap[a.q27] ?? .3;
  const orgMap: Record<string, number> = { 'CRM': 1, 'Planilha': .5, 'WhatsApp (etiquetas e conversas)': .3, 'Caderno / memória': .1, 'Não organizamos': 0 };
  const org = orgMap[a.q28] ?? 0;
  const hasCRM = a.q28 === 'CRM';
  const fuMap: Record<string, number> = { 'Sim, automatizado': 1, 'Sim, manual com cadência definida': .75, 'Às vezes, sem padrão': .3, 'Não': 0 };
  const follow = fuMap[a.q29] ?? 0;
  const referral = sources.includes('Indicação / boca a boca') ? 1 : 0;
  const googlePresence = sources.includes('Google orgânico / Google Maps') || sources.includes('Google Ads') ? 1 : 0;
  const diversity = clamp(sources.filter(s => s !== 'Outros').length / 4);

  // ---- Financeiro -------------------------------------------------------
  const lastMonth = num(a.q15) ?? 0;
  const avg3 = num(a.q16);
  const currentRevenue = avg3 ?? lastMonth;
  const targetRevenue = Math.max(num(a.q17) ?? currentRevenue, 0);
  const gap = Math.max(0, targetRevenue - currentRevenue);
  const gapPct = currentRevenue > 0 ? gap / currentRevenue : 1;
  const months = parseInt(a.q18) || 12;

  const currentSales = num(a.q26);
  const currentLeads = num(a.q25);
  if (currentSales === null) unknowns++;
  if (currentLeads === null) unknowns++;

  let ticket = num(a.q12) ?? 0;
  if (!ticket && currentSales && currentRevenue) {
    ticket = currentRevenue / currentSales;
    assumptions.push({ label: 'Ticket médio', value: brl(ticket), reason: 'Calculado pela divisão faturamento ÷ vendas, pois o ticket não foi informado.' });
  }
  if (!ticket) ticket = 1;

  let margin = num(a.q13);
  const marginIsHyp = margin === null;
  if (marginIsHyp) { margin = 30; unknowns++; assumptions.push({ label: 'Margem', value: '30%', reason: 'Margem não informada. Usamos 30% como hipótese conservadora para calcular o CAC máximo. Substitua pelo número real.' }); }
  const marginF = clamp((margin as number) / 100, 0.01, 1);
  const grossProfitPerSale = ticket * marginF;

  // Conversão: a do mercado manda. A da empresa só é usada se for MENOR (mais conservadora).
  const [cMin, cTyp, cMax] = ref.close;
  let observedClose: number | null = null;
  if (currentLeads && currentSales !== null && currentLeads > 0 && currentSales <= currentLeads) observedClose = currentSales / currentLeads;
  let closeRate = cTyp; let closeIsHyp = true;
  if (observedClose !== null && observedClose < cTyp) {
    closeRate = Math.max(observedClose, 0.005); closeIsHyp = false;
  } else if (observedClose !== null) {
    assumptions.push({ label: 'Taxa de conversão usada no plano', value: pct(cTyp), reason: `Sua taxa atual (${pct(observedClose)}) está acima da média de mercado para leads de mídia paga (${pct(cMin)} a ${pct(cMax)}). Normalmente isso acontece porque indicação e clientes antigos convertem muito mais. Para planejar novos leads, usamos a taxa típica do mercado: ${pct(cTyp)}.` });
  } else {
    assumptions.push({ label: 'Taxa de conversão', value: pct(cTyp), reason: `Sem dados de leads e vendas. Usamos a taxa típica do mercado de ${segment} (${pct(cMin)} a ${pct(cMax)}).` });
  }

  const additionalSales = gap > 0 ? Math.ceil(gap / ticket) : 0;
  const baseSales = currentSales ?? (currentRevenue > 0 ? Math.round(currentRevenue / ticket) : 0);
  const totalSalesNeeded = baseSales + additionalSales;
  const capacity = num(a.q14) ?? 0;
  const capacityOk = capacity === 0 ? true : totalSalesNeeded <= capacity;
  const requiredLeads = additionalSales > 0 ? Math.ceil(additionalSales / closeRate) : 0;
  const totalLeadsNeeded = (currentLeads ?? 0) + requiredLeads;

  const currentMkt = num(a.q23) ?? 0;
  let currentCpl: number | null = null;
  let cplRange: [number, number] = [ref.cpl[0], ref.cpl[1]];
  let cplBase = (cplRange[0] + cplRange[1]) / 2;
  let cplIsHyp = true;
  if (ads >= .7 && currentMkt > 0 && currentLeads && currentLeads > 0) {
    currentCpl = currentMkt / currentLeads;
    // usa o CPL real se estiver numa faixa plausível; nunca abaixo do mínimo de mercado
    if (currentCpl > ref.cpl[0] * 0.5 && currentCpl < ref.cpl[1] * 3) {
      cplBase = Math.max(currentCpl, ref.cpl[0]); cplIsHyp = false;
      cplRange = [Math.max(cplBase * 0.8, ref.cpl[0] * 0.8), cplBase * 1.4];
    }
  }
  if (cplIsHyp) assumptions.push({ label: 'Custo por lead (CPL)', value: `${brl(cplRange[0])} a ${brl(cplRange[1])}`, reason: 'Faixa de mercado do segmento, usada até existir histórico real de campanhas. Será recalculada com os dados reais.' });
  assumptions.push({ label: 'Estrutura (gestão, criativos, ferramentas)', value: '≈ 30% da mídia (mín. R$ 1.000)', reason: 'Campanha não roda sozinha: há custo de gestão de tráfego, produção de criativos e ferramentas. Incluímos esse custo para o retorno não ficar irreal.' });
  assumptions.push({ label: 'Curva de aprendizado', value: '50% → 75% → 90% → 100%', reason: 'Nos 3 primeiros meses as campanhas e o comercial ainda estão aprendendo. A eficiência sobe mês a mês.' });

  const media = additionalSales > 0 ? Math.max(r50(requiredLeads * cplBase), MIN_MEDIA) : 0;
  const structure = structureFor(media);
  const investmentBase = media + structure;
  const investmentRange: [number, number] = additionalSales > 0
    ? [Math.max(r50(requiredLeads * cplRange[0]), MIN_MEDIA) + structureFor(r50(requiredLeads * cplRange[0])),
       r50(requiredLeads * cplRange[1]) + structureFor(r50(requiredLeads * cplRange[1]))]
    : [0, 0];
  const willingness = num(a.q30) ?? 0;
  const feasibility = investmentBase > 0 ? willingness / investmentBase : 1;
  const cacBase = additionalSales > 0 ? investmentBase / additionalSales : 0;
  const maxCac = grossProfitPerSale;
  const economicsOk = additionalSales === 0 || cacBase <= maxCac;

  // Funil reverso detalhado (modelo coerente com a taxa lead→venda)
  const proposalToSale = clamp(closeRate * 2.5, 0.2, 0.5);
  const rest = closeRate / proposalToSale;
  const leadToMql = clamp(0.35 + rest * 0.45, 0.35, 0.85);
  const mqlToProposal = clamp(rest / leadToMql, 0.05, 1);
  const visitToLead = 0.08;
  const funnel = {
    revenue: gap, sales: additionalSales,
    proposals: Math.ceil(additionalSales / proposalToSale),
    mql: Math.ceil(additionalSales / proposalToSale / mqlToProposal),
    leads: requiredLeads, visits: Math.ceil(requiredLeads / visitToLead), media,
    rates: { visitToLead, leadToMql, mqlToProposal, proposalToSale },
  };

  // Com o orçamento informado
  const budgetMedia = willingness > 0 ? r50(Math.max(willingness - structureFor(willingness / 1.3), 0)) : 0;
  const budgetLeads = Math.floor(budgetMedia / cplBase);
  const budgetSales = Math.floor(budgetLeads * closeRate);
  const achievableWithBudget = { leads: budgetLeads, sales: budgetSales, revenue: r(budgetSales * ticket), media: budgetMedia, structure: willingness - budgetMedia };

  // Rampa mês a mês, com curva de aprendizado
  const ramp: Analysis['financial']['ramp'] = [];
  const rampMonths = Math.min(months, 12);
  for (let m = 1; m <= rampMonths; m++) {
    const f = m / rampMonths;
    const eff = LEARNING[m - 1] ?? 1;
    const extraSales = Math.ceil((gap * f) / ticket);
    const leads = Math.ceil(extraSales / (closeRate * eff));
    const mm = extraSales > 0 ? Math.max(r50(leads * cplBase), MIN_MEDIA) : 0;
    ramp.push({ month: m, efficiency: eff, targetRevenue: r(currentRevenue + gap * f), extraSales, leads, media: mm, investment: mm + structureFor(mm) });
  }

  // ---- Cenários ---------------------------------------------------------
  // (1) Para bater a meta: vendas fixas, investimento varia.
  const mkGoal = (key: Scenario['key'], label: string, cpl: number, cr: number): Scenario => {
    const sales = additionalSales;
    const leads = sales > 0 ? Math.ceil(sales / cr) : 0;
    const md = sales > 0 ? Math.max(r50(leads * cpl), MIN_MEDIA) : 0;
    const st = structureFor(md);
    const investment = md + st;
    const revenue = r(sales * ticket);
    const gp = r(sales * grossProfitPerSale);
    return { key, label, cpl, closeRate: cr, leads, sales, media: md, structure: st, investment, revenue, grossProfit: gp,
      cac: sales ? investment / sales : 0, roas: investment ? revenue / investment : 0, profitReturn: investment ? gp / investment : 0 };
  };
  // Otimista não é "tudo dá certo": CPL 20% abaixo do base e conversão 15% acima, sem passar do teto do mercado.
  const crCons = Math.max(closeRate * 0.75, cMin * 0.75);
  const crAgr = Math.min(closeRate * 1.15, cMax);
  const cplCons = Math.max(cplBase * 1.3, cplRange[1] * 0.9);
  const cplAgr = Math.max(cplBase * 0.8, cplRange[0]);
  const scenarios: Scenario[] = [
    mkGoal('conservador', 'Conservador', cplCons, Math.min(crCons, closeRate)),
    mkGoal('base', 'Base', cplBase, closeRate),
    mkGoal('agressivo', 'Otimista', cplAgr, crAgr),
  ];
  // (2) Com o orçamento informado: investimento fixo, resultado varia.
  const mkBudget = (key: Scenario['key'], label: string, cpl: number, cr: number): Scenario => {
    const md = budgetMedia; const st = willingness - md;
    const leads = Math.floor(md / cpl);
    const sales = Math.floor(leads * cr);
    const revenue = r(sales * ticket);
    const gp = r(sales * grossProfitPerSale);
    return { key, label, cpl, closeRate: cr, leads, sales, media: md, structure: st, investment: willingness, revenue, grossProfit: gp,
      cac: sales ? willingness / sales : 0, roas: willingness ? revenue / willingness : 0, profitReturn: willingness ? gp / willingness : 0 };
  };
  const budgetScenarios: Scenario[] = willingness > 0 ? [
    mkBudget('conservador', 'Conservador', cplCons, Math.min(crCons, closeRate)),
    mkBudget('base', 'Base', cplBase, closeRate),
    mkBudget('agressivo', 'Otimista', cplAgr, crAgr),
  ] : [];

  // ---- Scores -----------------------------------------------------------
  const spendRatio = currentRevenue > 0 ? currentMkt / currentRevenue : 0;
  const spendScore = spendRatio <= 0 ? 0 : spendRatio < .02 ? .4 : spendRatio < .05 ? .7 : spendRatio <= .12 ? 1 : .8;
  const leadAdequacy = currentLeads === null ? .3 : clamp(currentLeads / Math.max(totalLeadsNeeded, 1));
  const closeScore = observedClose === null ? .3 : clamp(observedClose / cTyp);
  const capScore = capacity === 0 ? .5 : capacityOk ? 1 : clamp(capacity / Math.max(totalSalesNeeded, 1));
  const knowsTicket = num(a.q12) ? 1 : 0;
  const knowsMargin = marginIsHyp ? 0 : 1;
  const knowsLeads = currentLeads === null ? 0 : 1;
  const knowsSales = currentSales === null ? 0 : 1;
  const knowsBest = a.q10 && a.q10 !== UNKNOWN ? 1 : 0;
  if (!knowsBest) unknowns++;

  const P = (x: number) => r(clamp(x) * 100);
  const pillars: Record<Pillar, number> = {
    marketing: P(.15 * (hasSite ? 1 : 0) + .1 * (hasInsta ? 1 : 0) + .2 * ads + .15 * diversity + .15 * spendScore + .25 * leadAdequacy),
    vendas: P(.3 * resp + .3 * follow + .25 * closeScore + .15 * capScore),
    tecnologia: P(.5 * org + .2 * (hasSite ? 1 : 0) + .15 * (ads >= .7 ? .7 : ads) + .15 * (a.q29 === 'Sim, automatizado' ? 1 : hasCRM ? .5 : 0)),
    indicadores: P(.15 * knowsTicket + .2 * knowsMargin + .2 * knowsLeads + .15 * knowsSales + .1 * knowsBest + .2 * (org >= .5 ? org : 0)),
  };
  const journey: Record<Stage, number> = {
    descoberta: P(.3 * (hasSite ? 1 : 0) + .2 * (hasInsta ? 1 : 0) + .25 * googlePresence + .15 * diversity + .1 * age),
    atencao: P(.35 * ads + .25 * spendScore + .2 * (hasInsta ? 1 : 0) + .2 * leadAdequacy),
    consideracao: P((.25 * (hasSite ? 1 : 0) + .15 * (hasInsta ? 1 : 0) + .2 * age + .2 * referral + .2 * resp) * .85),
    acao: P(.3 * resp + .3 * follow + .25 * closeScore + .15 * org),
    relacionamento: P(.35 * referral + .25 * follow + .25 * org + .15 * age),
  };
  let overall = .25 * pillars.marketing + .35 * pillars.vendas + .2 * pillars.tecnologia + .2 * pillars.indicadores;
  const weakest = Math.min(...Object.values(pillars), ...Object.values(journey));
  overall -= Math.max(0, 50 - weakest) * 0.5;
  const minPillar = Math.min(...Object.values(pillars));
  if (minPillar < 25) overall = Math.min(overall, minPillar + 35);
  overall = r(clamp(overall, 0, 100));
  const ml = maturityLevel(overall);
  const mainStage = (Object.keys(journey) as Stage[]).reduce((m, k) => (journey[k] < journey[m] ? k : m), 'descoberta' as Stage);
  const mainPillar = (Object.keys(pillars) as Pillar[]).reduce((m, k) => (pillars[k] < pillars[m] ? k : m), 'marketing' as Pillar);
  const confidence = r(clamp(1 - unknowns * 0.09 - (closeIsHyp ? .08 : 0) - (cplIsHyp ? .1 : 0), .3, .85) * 100);

  // ---- Canais -----------------------------------------------------------
  const ticketFit = clamp(ticket / (cplBase / Math.max(closeRate, .01)) / 3);
  const google = P(.35 * ref.searchIntent + .2 * ref.urgency + .15 * (hasSite ? 1 : .4) + .15 * ticketFit + .15 * (isLocal ? 1 : .7));
  const meta = P(.35 * ref.visual + .2 * (1 - ref.b2b) + .15 * (hasInsta ? 1 : .3) + .15 * ticketFit + .15 * (1 - ref.urgency * .5));
  const commercialCapacity = pillars.vendas;
  const leadsAlreadyEnough = currentLeads !== null && currentLeads >= (currentSales ?? 0) / cTyp * 1.2 && commercialCapacity < 40;
  let recommendation: Analysis['channels']['recommendation'];
  let headline = '', reason = '', phase2 = '';
  if (leadsAlreadyEnough || (capacity > 0 && baseSales >= capacity)) {
    recommendation = 'FIX_FOUNDATION_FIRST';
    headline = 'Não recomendamos aumentar mídia neste momento.';
    reason = capacity > 0 && baseSales >= capacity
      ? `Sua operação já trabalha no limite (${baseSales} de ${capacity} clientes/mês). Mais demanda agora geraria fila, queda de qualidade e desperdício de verba. A prioridade é ampliar capacidade e estruturar o processo.`
      : `Você já recebe cerca de ${currentLeads} contatos por mês, mas o processo comercial (score ${commercialCapacity}/100) está perdendo vendas. Antes de comprar mais leads, a prioridade é CRM, tempo de resposta e follow-up.`;
    phase2 = google >= meta ? 'Depois da fundação (30–45 dias): Google Search para capturar demanda ativa.' : 'Depois da fundação (30–45 dias): Meta Ads para gerar demanda e remarketing.';
  } else if (Math.abs(google - meta) < 10 && google >= 60 && meta >= 60) {
    recommendation = 'BOTH';
    headline = 'Começar com Google Search + Meta Ads, com pesos diferentes.';
    reason = 'Existe procura ativa pelo seu serviço e a oferta tem bom potencial visual. O Google captura quem já está procurando; o Meta gera demanda nova e faz remarketing de quem visitou.';
    phase2 = 'Fase 2: concentrar verba no canal com menor custo por venda após 60–90 dias de dados.';
  } else if (google > meta) {
    recommendation = 'GOOGLE_FIRST';
    headline = 'Começar por Google Search.';
    reason = `Seu cliente demonstra intenção ativa: ele pesquisa por "${offerLow}" quando precisa. Isso gera leads mais quentes e um ciclo de venda mais curto${isLocal ? ', especialmente com segmentação local' : ''}.`;
    phase2 = 'Fase 2: Meta Ads para remarketing e geração de demanda.';
  } else {
    recommendation = 'META_FIRST';
    headline = 'Começar por Meta Ads (Instagram e Facebook).';
    reason = 'A procura ativa no Google tende a ser limitada no seu segmento, mas a oferta tem forte potencial de demonstração visual e o público é bem segmentável.';
    phase2 = 'Fase 2: Google Search para capturar quem passou a procurar pela marca e pelo serviço.';
  }
  let gShare = google / Math.max(google + meta, 1);
  if (recommendation === 'GOOGLE_FIRST') gShare = Math.max(gShare, .65);
  if (recommendation === 'META_FIRST') gShare = Math.min(gShare, .35);
  const mediaForSplit = willingness > 0 ? Math.min(budgetMedia, media || budgetMedia) : media;
  const split = { google: r50(mediaForSplit * gShare), meta: 0 };
  split.meta = Math.max(0, r50(mediaForSplit) - split.google);

  // ---- Auditoria de comunicação ----------------------------------------
  const qtdProducts = String(a.q8 || '').split(/\n|,|;/).filter((s: string) => s.trim()).length;
  const comm: CommItem[] = [
    { key: 'proposta', label: 'Proposta de valor', score: P(.35 + (a.q11 ? .2 : 0) + (knowsBest ? .15 : 0) + (a.q20 && String(a.q20).length > 40 ? .15 : 0) - (qtdProducts > 6 ? .15 : 0)),
      status: '', tip: `Deixe claro em uma frase: para quem é, qual resultado entrega e por que a sua empresa. Coloque "${priorityOffer}" como protagonista.` },
    { key: 'clareza', label: 'Clareza da mensagem', score: P(.6 - (qtdProducts > 6 ? .25 : qtdProducts > 3 ? .1 : 0) + (a.q11 ? .15 : 0) + (hasSite ? .1 : 0)),
      status: '', tip: 'Uma página = uma oferta. Quanto mais serviços competem pela atenção na mesma página, menor a conversão.' },
    { key: 'cta', label: 'Chamadas à ação (CTAs)', score: P(.25 + (hasSite ? .2 : 0) + resp * .3 + (ads >= .7 ? .15 : 0)),
      status: '', tip: 'Um CTA principal e repetido ("Falar no WhatsApp", "Pedir orçamento"), visível na primeira dobra e ao final de cada seção.' },
    { key: 'site', label: 'Website / landing page', score: hasSite ? P(.45 + (googlePresence ? .15 : 0) + age * .15 + (ads >= .7 ? .1 : 0)) : 8,
      status: '', tip: hasSite ? `Crie uma landing page dedicada para "${priorityOffer}", com prova social, FAQ e formulário de qualificação.` : 'Você ainda não tem site. Uma landing page de alta conversão é a base para anúncios, Google e credibilidade.' },
    { key: 'instagram', label: 'Instagram', score: hasInsta ? P(.4 + (sources.includes('Instagram orgânico') ? .2 : 0) + (usesMetaAds ? .15 : 0) + age * .1) : 5,
      status: '', tip: 'Bio com promessa + CTA, destaques com depoimentos, cases, bastidores e perguntas frequentes. Fixe 3 posts que vendem.' },
    { key: 'whatsapp', label: 'WhatsApp', score: P(resp * .6 + follow * .3 + (org >= .3 ? .1 : 0)),
      status: '', tip: 'WhatsApp Business com mensagem de boas-vindas, respostas rápidas, etiquetas por etapa e resposta em até 5 minutos.' },
    { key: 'google', label: 'Google Meu Negócio', score: P((sources.includes('Google orgânico / Google Maps') ? .55 : .2) + (isLocal ? .1 : 0) + age * .15),
      status: '', tip: 'Perfil completo, fotos reais, categorias corretas, posts semanais e uma rotina para pedir avaliação a cada cliente atendido.' },
    { key: 'blog', label: 'Blog / conteúdo', score: hasSite ? P(.2 + (googlePresence ? .15 : 0)) : 0,
      status: '', tip: 'Conteúdos que respondem as dúvidas e objeções do cliente antes da compra também ranqueiam no Google e reduzem o CAC no longo prazo.' },
  ];
  comm.forEach(c => { c.score = Math.max(0, Math.min(100, c.score)); c.status = c.score >= 70 ? 'Bom' : c.score >= 40 ? 'Atenção' : 'Crítico'; });
  const commScore = r(comm.reduce((s, c) => s + c.score, 0) / comm.length);

  // ---- Gargalos ---------------------------------------------------------
  const B: Bottleneck[] = [];
  const add = (b: Omit<Bottleneck, 'priority'>) => B.push({ ...b, priority: priorityOf(b.severity) });

  if (capacity > 0 && !capacityOk) add({ id: 'capacidade', title: 'Capacidade operacional abaixo da meta', stage: 'acao', pillar: 'vendas', severity: baseSales >= capacity ? 95 : 85, confidence: 'Alta',
    found: `Para chegar em ${brl(targetRevenue)} você precisará de cerca de ${totalSalesNeeded} clientes/mês, mas hoje consegue atender ${capacity}.`,
    evidence: `Capacidade informada: ${capacity} | Necessário: ${totalSalesNeeded}`,
    impact: 'Investir em demanda sem capacidade gera fila, queda na experiência e verba desperdiçada.',
    why: 'Crescimento sustentável depende de entregar bem o que se vende.',
    todo: 'Aumentar capacidade (equipe, agenda, processos) ou subir o ticket médio para atingir a meta com menos clientes.' });
  if (follow < .5) add({ id: 'followup', title: 'Follow-up inexistente ou sem padrão', stage: 'acao', pillar: 'vendas', severity: follow === 0 ? 88 : 75, confidence: 'Alta',
    found: `Você informou "${a.q29}" para o acompanhamento de quem pediu orçamento e não comprou.`,
    evidence: currentLeads && currentSales !== null ? `${currentLeads} leads/mês e ${currentSales} vendas: ${Math.max(currentLeads - currentSales, 0)} contatos ficam sem fechamento todo mês.` : 'Sem cadência definida de retorno.',
    impact: 'Grande parte das vendas acontece entre o 2º e o 5º contato. Sem follow-up, essa receita fica com a concorrência.',
    why: 'É a forma mais barata de aumentar vendas: o lead já foi pago.',
    todo: 'Criar cadência de 6 toques em 15 dias (WhatsApp, ligação, prova social) e registrar o motivo de perda.' });
  if (resp <= .4) add({ id: 'resposta', title: 'Tempo de resposta lento', stage: 'acao', pillar: 'vendas', severity: resp <= .25 ? 85 : 72, confidence: 'Média',
    found: `Seu tempo médio de resposta é "${a.q27}".`, evidence: `Tempo de resposta informado: ${a.q27}`,
    impact: 'Leads respondidos nos primeiros minutos convertem muito mais. Quanto mais tempo, mais o cliente esfria ou fecha com quem respondeu primeiro.',
    why: 'Velocidade é percebida como cuidado e profissionalismo.',
    todo: 'Definir SLA de resposta de até 5 minutos em horário comercial, com mensagem automática e responsável por turno.' });
  if (org < 1) add({ id: 'crm', title: hasCRM ? 'CRM subutilizado' : 'Leads sem CRM', stage: 'acao', pillar: 'tecnologia', severity: org <= .1 ? 85 : org <= .3 ? 75 : 62, confidence: 'Alta',
    found: `Hoje os leads são organizados em: "${a.q28}".`, evidence: 'Sem pipeline estruturado, não há visão de etapas, perdas e previsões.',
    impact: 'Oportunidades são esquecidas, não há métricas por etapa e não é possível saber qual canal gera vendas de verdade.',
    why: 'Sem CRM não existe gestão comercial — só memória.',
    todo: 'Implantar CRM com pipeline (Novo → Em atendimento → Qualificado → Orçamento → Fechado/Perdido), integrado ao WhatsApp.' });
  if (observedClose !== null && observedClose < cMin) add({ id: 'conversao', title: 'Conversão abaixo do mercado', stage: 'acao', pillar: 'vendas', severity: 80, confidence: 'Média',
    found: `Sua conversão é de ${pct(observedClose)}, abaixo da faixa de mercado (${pct(cMin)} a ${pct(cMax)}).`, evidence: `${currentSales} vendas ÷ ${currentLeads} leads`,
    impact: 'Cada ponto percentual de conversão reduz diretamente o investimento necessário para chegar à meta.',
    why: 'O problema pode estar na qualificação, no atendimento ou na proposta — não necessariamente no tráfego.',
    todo: 'Diagnóstico comercial, roteiro de atendimento, formulário de qualificação e treinamento do time.' });
  if (currentLeads !== null && gap > 0 && requiredLeads > currentLeads * 0.5) add({ id: 'demanda', title: 'Volume de demanda insuficiente para a meta', stage: 'atencao', pillar: 'marketing', severity: requiredLeads > currentLeads ? 80 : 70, confidence: closeIsHyp ? 'Média' : 'Alta',
    found: `Você recebe ${currentLeads} contatos/mês. Para a meta, precisa de mais ${requiredLeads} leads/mês vindos de canais previsíveis.`, evidence: `${additionalSales} vendas a mais ÷ conversão de ${pct(closeRate)} = ${requiredLeads} leads`,
    impact: 'Mesmo com um comercial excelente, o volume atual não sustenta a meta.',
    why: 'É preciso um sistema previsível de geração de demanda.',
    todo: 'Estruturar campanhas no canal recomendado, landing page dedicada e produção contínua de criativos.' });
  if (!hasSite) add({ id: 'site', title: 'Sem site ou landing page', stage: 'consideracao', pillar: 'marketing', severity: 74, confidence: 'Alta',
    found: 'A empresa não possui site.', evidence: 'Resposta da pergunta 5.',
    impact: 'Reduz credibilidade, impede campanhas de Google com boa qualidade e dificulta rastrear conversões.',
    why: 'O site é o "vendedor 24h" e a base para medir resultados.', todo: `Criar landing page de alta conversão para "${priorityOffer}".` });
  if (!economicsOk && gap > 0) add({ id: 'economia', title: 'Custo por cliente acima do lucro por venda', stage: 'acao', pillar: 'indicadores', severity: 82, confidence: marginIsHyp || cplIsHyp ? 'Baixa' : 'Média',
    found: `O custo para conquistar um cliente (≈ ${brl(cacBase)}) supera o lucro bruto da primeira venda (≈ ${brl(maxCac)}).`, evidence: `Ticket ${brl(ticket)} × margem ${margin}% = ${brl(maxCac)}`,
    impact: 'Escalar mídia nessas condições aumenta faturamento, mas pode reduzir lucro.',
    why: 'Crescer com lucro exige que a aquisição se pague.', todo: 'Aumentar conversão, subir ticket, criar recompra/upsell ou focar no produto de maior margem.' });
  if (marginIsHyp || !knowsBest) add({ id: 'numeros', title: 'Falta de clareza nos números do negócio', stage: 'acao', pillar: 'indicadores', severity: 60, confidence: 'Alta',
    found: 'Margem ou produto mais lucrativo não foram informados.', evidence: 'Respostas "Não sei" nas perguntas 10/13.',
    impact: 'Sem margem não é possível definir quanto se pode pagar por cliente.', why: 'Decisão de investimento precisa de economia unitária.', todo: 'Levantar margem por produto e montar painel simples de indicadores.' });
  if (gap > 0 && willingness > 0 && feasibility < 0.7) add({ id: 'orcamento', title: 'Investimento disponível abaixo do necessário', stage: 'atencao', pillar: 'marketing', severity: 68, confidence: cplIsHyp ? 'Baixa' : 'Média',
    found: `A meta exige cerca de ${brl(investmentBase)}/mês (mídia + estrutura); o investimento disponível é ${brl(willingness)}.`, evidence: `Com ${brl(willingness)} a projeção base é de +${achievableWithBudget.sales} vendas (≈ ${brl(achievableWithBudget.revenue)}/mês).`,
    impact: 'A meta tende a levar mais tempo do que o desejado.', why: 'Meta, prazo e investimento precisam estar alinhados.', todo: 'Aumentar o prazo, escalar o investimento por etapas ou elevar a conversão para baratear cada venda.' });
  if (mainChannel === 'Indicação / boca a boca' && diversity <= .5) add({ id: 'dependencia', title: 'Dependência de indicação', stage: 'descoberta', pillar: 'marketing', severity: 64, confidence: 'Alta',
    found: 'A maior parte das vendas vem de indicação.', evidence: `Canal principal: ${mainChannel}`,
    impact: 'Indicação é ótima, mas não é previsível nem escalável.', why: 'Crescimento previsível exige canais controláveis.', todo: 'Manter e estruturar a indicação (programa) e abrir um canal pago previsível.' });
  if (ads === 0 && gap > 0) add({ id: 'midia', title: 'Nenhum canal de mídia paga testado', stage: 'atencao', pillar: 'marketing', severity: 58, confidence: 'Alta',
    found: 'A empresa nunca utilizou Google Ads ou Meta Ads.', evidence: 'Resposta da pergunta 24.', impact: 'Crescimento depende de canais lentos ou imprevisíveis.',
    why: 'Mídia paga é a alavanca mais rápida e mensurável de demanda.', todo: 'Começar pelo canal recomendado com orçamento de teste e rastreamento configurado.' });
  if (!referral) add({ id: 'indicacao', title: 'Indicação e recompra pouco exploradas', stage: 'relacionamento', pillar: 'marketing', severity: 50, confidence: 'Média',
    found: 'Indicação não aparece entre as origens de clientes.', evidence: 'Resposta da pergunta 21.', impact: 'Clientes satisfeitos não estão virando novos clientes.',
    why: 'Indicação tem o menor custo de aquisição de todos os canais.', todo: 'Criar programa de indicação e rotina de pós-venda.' });
  B.sort((x, y) => y.severity - x.severity);

  // ---- Oportunidades ----------------------------------------------------
  const opportunities: Analysis['opportunities'] = [];
  if (currentLeads && currentSales !== null && currentLeads > currentSales) {
    const lost = currentLeads - currentSales;
    const plus = Math.max(1, Math.floor(currentLeads * 0.03));
    opportunities.push({ title: 'Receita escondida nos leads que já chegam', detail: `${lost} contatos/mês não compram. Recuperar 3% deles com follow-up significaria ~${plus} venda(s) a mais (≈ ${brl(plus * ticket)}/mês) sem gastar mais com mídia.` });
  }
  if (a.q10 && a.q10 !== UNKNOWN && a.q11 && String(a.q10).trim().toLowerCase() !== String(a.q11).trim().toLowerCase())
    opportunities.push({ title: 'Alinhar foco com o produto de maior margem', detail: `O produto de maior margem é "${a.q10}". Avalie usá-lo como oferta principal ou como upsell de "${a.q11}".` });
  opportunities.push({ title: `Captação dedicada para "${priorityOffer}"`, detail: 'Landing page própria + campanha + formulário de qualificação para o serviço que você mais quer vender.' });
  if (isLocal) opportunities.push({ title: `Dominar a busca local em ${cityName}`, detail: 'Google Meu Negócio com avaliações frequentes costuma ser o canal local de menor custo e maior confiança.' });
  opportunities.push({ title: 'Reativação da base', detail: 'Clientes antigos e leads perdidos podem ser reativados por WhatsApp com uma oferta de retorno — aquisição mais barata que lead novo.' });

  // ---- Plano de ação (prático) -----------------------------------------
  const has = (id: string) => B.some(b => b.id === id);
  const A: Omit<ActionItem, 'score' | 'priority'>[] = [];

  A.push({ id: 'oferta', title: `Definir a oferta principal: "${priorityOffer}"`, reason: 'Todo o plano de captação parte de uma oferta clara, com preço, diferencial e promessa. Sem isso, site e anúncios ficam genéricos.',
    stage: 'atencao', pillar: 'marketing', phase: '7d', impact: 8, effort: 2, urgency: 9, owner: 'Sócio / Marketing', kpi: 'Oferta documentada', time: '2 a 3 dias', cost: 'R$ 0',
    steps: [
      { t: `Confirme o carro-chefe: "${priorityOffer}"`, d: `É o que você mais quer vender, tem margem e capacidade de entregar. Ticket de referência: ${brl(ticket)}.` },
      { t: 'Escreva a promessa em uma frase', d: 'Modelo: "[Resultado desejado] para [público] em [prazo/condição], sem [principal medo]". Teste 5 versões e escolha a mais clara.' },
      { t: 'Liste 3 diferenciais que dá para provar', d: 'Ex.: tempo de entrega, garantia, anos de mercado, tecnologia, atendimento, nº de clientes atendidos. Diferencial sem prova não convence.' },
      { t: 'Mapeie as 5 objeções e responda cada uma', d: '"Está caro", "vou pensar", "preciso falar com meu sócio/cônjuge", "não conheço vocês", "o concorrente faz mais barato". Escreva a resposta de cada uma.' },
      { t: 'Monte a condição comercial', d: 'Preço, parcelamento, forma de pagamento, bônus, garantia e um motivo real para decidir agora (agenda limitada, condição do mês).' },
      { t: 'Feche a "ficha da oferta" em 1 página', d: 'Esse documento alimenta o site, os anúncios, o script de vendas e o treinamento do time.' },
    ],
    deliverables: ['Ficha da oferta (1 página)', 'Promessa em 1 frase', 'Lista de objeções com respostas'], mistakes: ['Querer vender todos os serviços ao mesmo tempo', 'Usar "qualidade" e "bom atendimento" como diferencial'] });

  if (has('capacidade')) A.push({ id: 'capacidade', title: 'Ampliar a capacidade de atendimento', reason: 'A meta exige mais clientes do que a operação suporta hoje.', stage: 'acao', pillar: 'vendas', phase: '7d', impact: 10, effort: 7, urgency: 10,
    owner: 'Sócio / Operação', kpi: 'Clientes atendidos/mês', time: '2 a 6 semanas', cost: 'Depende da contratação',
    steps: [
      { t: 'Mapeie onde a entrega trava', d: 'Agenda, equipe técnica, fornecedor, estrutura física? Meça o tempo de cada etapa.' },
      { t: 'Calcule a capacidade necessária', d: `Meta: ${totalSalesNeeded} clientes/mês. Capacidade atual: ${capacity}. Falta: ${Math.max(totalSalesNeeded - capacity, 0)}.` },
      { t: 'Decida a alavanca', d: 'Contratar, terceirizar parte da entrega, padronizar processos ou subir o ticket para atingir a meta com menos clientes.' },
      { t: 'Libere a mídia em etapas', d: 'Aumente o investimento só quando a nova capacidade estiver pronta.' },
    ], deliverables: ['Plano de capacidade', 'Data de liberação da nova capacidade'] });

  if (has('resposta')) A.push({ id: 'sla', title: 'Configurar WhatsApp Business e SLA de 5 minutos', reason: 'Tempo de resposta lento está esfriando os leads — e cada lead custa dinheiro.', stage: 'acao', pillar: 'vendas', phase: '7d', impact: 9, effort: 2, urgency: 10,
    owner: 'Comercial', kpi: 'Tempo médio de 1ª resposta', time: '1 dia', cost: 'R$ 0',
    steps: [
      { t: 'Instale o WhatsApp Business no número comercial', d: 'Perfil completo: logo, descrição com a promessa, endereço, horário, site e catálogo com os principais serviços.' },
      { t: 'Crie a mensagem de saudação automática', d: `Ex.: "Olá! Que bom falar com você 😊 Sou da ${a.q1 || 'empresa'}. Para te ajudar mais rápido: qual serviço você procura e para quando precisa?"` },
      { t: 'Cadastre respostas rápidas', d: '/apresentacao, /comofunciona, /orcamento, /endereco, /agenda, /pagamento, /depoimentos.' },
      { t: 'Crie etiquetas por etapa', d: 'Novo lead · Em atendimento · Orçamento enviado · Follow-up · Fechado · Perdido.' },
      { t: 'Defina o responsável por turno', d: 'Uma pessoa sempre "de plantão" no horário comercial. Regra: nenhum lead espera mais de 5 minutos.' },
      { t: 'Meça toda semana', d: 'Anote o horário de chegada e da 1ª resposta de 20 leads e calcule a média.' },
    ], deliverables: ['WhatsApp Business configurado', 'Mensagens automáticas e respostas rápidas', 'Escala de plantão'], tools: ['WhatsApp Business', 'WhatsApp API oficial (volume alto)'],
    mistakes: ['Responder só com o preço', 'Deixar o lead para "responder depois"'] });

  if (has('followup')) A.push({ id: 'cadencia', title: 'Criar cadência de follow-up de 15 dias', reason: 'Leads que pediram orçamento estão sendo perdidos sem retorno — e a maioria das vendas acontece após o 2º contato.', stage: 'acao', pillar: 'vendas', phase: '7d', impact: 9, effort: 3, urgency: 9,
    owner: 'Comercial', kpi: 'Conversão de orçamentos em vendas', time: '2 dias para montar', cost: 'R$ 0',
    steps: [
      { t: 'Dia 0 — Atendimento + diagnóstico', d: 'Entenda a necessidade com 3–4 perguntas antes de passar preço.' },
      { t: 'Dia 1 — Orçamento/proposta', d: 'Envie a proposta e já pergunte: "Ficou alguma dúvida? Posso te ligar 5 minutos para explicar?"' },
      { t: 'Dia 3 — Prova social', d: 'Envie um depoimento ou case parecido com o caso do cliente.' },
      { t: 'Dia 5 — Ligação', d: 'Ligue. Áudio e ligação recuperam muitos leads que não respondem texto.' },
      { t: 'Dia 8 — Quebra de objeção', d: 'Aborde a objeção mais comum (preço, prazo, confiança) e ofereça uma condição ou alternativa.' },
      { t: 'Dia 15 — Última tentativa', d: '"Vou encerrar seu atendimento por aqui, tudo bem? Se ainda fizer sentido, é só me chamar." Registre o motivo de perda.' },
      { t: 'Lead perdido entra em nutrição', d: 'Lista de remarketing e reativação a cada 60–90 dias.' },
    ], deliverables: ['Cadência escrita com as mensagens', 'Campo "motivo de perda" registrado'], tools: ['CRM', 'WhatsApp Business'] });

  if (has('crm')) A.push({ id: 'crm', title: 'Implantar CRM e pipeline comercial', reason: 'Sem CRM não há gestão de oportunidades nem como saber qual canal gera vendas de verdade.', stage: 'acao', pillar: 'tecnologia', phase: org <= .1 ? '7d' : '30d', impact: 9, effort: 5, urgency: 8,
    owner: 'Comercial / Gestão', kpi: '% de leads registrados no CRM', time: '1 a 2 semanas', cost: 'R$ 0 a R$ 300/mês',
    steps: [
      { t: 'Escolha um CRM integrado ao WhatsApp', d: 'Para começar simples: Kommo, RD Station CRM ou Pipedrive. HubSpot tem plano gratuito.' },
      { t: 'Crie o funil (pipeline)', d: 'Novo lead → Em atendimento → Qualificado → Orçamento enviado → Negociação → Fechado / Perdido.' },
      { t: 'Crie os campos obrigatórios', d: 'Origem do lead (Google, Meta, indicação...), serviço de interesse, valor estimado, cidade e motivo de perda.' },
      { t: 'Integre os canais', d: 'WhatsApp, formulário do site e anúncios caindo direto no CRM, sem digitação manual.' },
      { t: 'Regra de ouro: 100% dos leads no CRM', d: 'Lead que não está no CRM não existe. Revise isso diariamente nas 2 primeiras semanas.' },
      { t: 'Reunião semanal de pipeline (30 min)', d: 'Toda segunda: leads parados, propostas abertas, motivos de perda e meta da semana.' },
    ], deliverables: ['CRM configurado com pipeline', 'Campos de origem e perda', 'Ritual semanal de pipeline'], tools: ['Kommo', 'RD Station CRM', 'Pipedrive', 'HubSpot (grátis)'] });

  if (has('numeros')) A.push({ id: 'numeros', title: 'Levantar margem e custo por produto', reason: 'Sem margem não é possível definir quanto se pode pagar por cliente.', stage: 'acao', pillar: 'indicadores', phase: '7d', impact: 7, effort: 3, urgency: 7,
    owner: 'Financeiro', kpi: 'Margem por produto', time: '3 dias', cost: 'R$ 0',
    steps: [
      { t: 'Liste os custos diretos de cada produto/serviço', d: 'Material, mão de obra, comissão, impostos, taxa de cartão.' },
      { t: 'Calcule a margem', d: 'Margem = (preço − custos diretos) ÷ preço.' },
      { t: 'Calcule o CAC máximo', d: 'CAC máximo = ticket × margem. É o teto que você pode pagar para conquistar um cliente na 1ª venda.' },
    ], deliverables: ['Planilha de margem por produto', 'CAC máximo definido'] });

  A.push({ id: 'tracking', title: 'Configurar rastreamento de conversões', reason: 'Sem mensuração não é possível saber qual canal, campanha ou anúncio gera vendas.', stage: 'atencao', pillar: 'tecnologia', phase: '7d', impact: 8, effort: 4, urgency: ads > 0 ? 9 : 7,
    owner: 'Marketing', kpi: 'Conversões rastreadas', time: '2 a 4 dias', cost: 'R$ 0',
    steps: [
      { t: 'Crie a conta do Google Tag Manager e instale no site', d: 'Um único código no site; todas as tags passam a ser gerenciadas pelo GTM.' },
      { t: 'Configure o Google Analytics 4', d: 'Eventos: generate_lead (formulário), clique no WhatsApp, clique no telefone.' },
      { t: 'Instale o Pixel da Meta + API de Conversões', d: 'Evento "Lead" no envio do formulário e no clique do WhatsApp. A API de Conversões melhora a precisão.' },
      { t: 'Configure as conversões no Google Ads', d: 'Importe do GA4 ou crie a tag de conversão: formulário, WhatsApp e ligação.' },
      { t: 'Padronize UTMs em todos os links', d: 'utm_source (google/meta), utm_medium (cpc), utm_campaign (nome da campanha). Assim o CRM sabe a origem de cada lead.' },
      { t: 'Teste tudo antes de ligar as campanhas', d: 'Use o Tag Assistant (Google) e o Gerenciador de Eventos (Meta) para confirmar que cada evento dispara.' },
    ], deliverables: ['GTM + GA4 + Pixel funcionando', 'Conversões configuradas nas plataformas', 'Padrão de UTMs'], tools: ['Google Tag Manager', 'GA4', 'Meta Pixel + CAPI', 'Google Ads'] });

  A.push({ id: 'lp', title: hasSite ? `Criar landing page de alta conversão para "${priorityOffer}"` : `Criar o site / landing page de "${priorityOffer}"`,
    reason: hasSite ? 'Uma página dedicada a uma única oferta converte muito mais que o site institucional.' : 'A empresa ainda não tem site — é a base para anúncios, Google e credibilidade.',
    stage: 'atencao', pillar: 'marketing', phase: hasSite ? '30d' : '7d', impact: 9, effort: 5, urgency: hasSite ? 7 : 9,
    owner: 'Marketing / Vortex', kpi: 'Taxa de conversão da página (meta: 8% a 15%)', time: '7 a 15 dias', cost: 'R$ 0 a R$ 3.000 (fazer você mesmo x profissional)',
    steps: [
      { t: '1. Domínio e hospedagem', d: 'Registre o domínio no registro.br (≈ R$ 40/ano). Hospedagem: Hostinger/HostGator (WordPress) ou a própria Framer/Webflow.' },
      { t: '2. Escolha a ferramenta', d: 'WordPress + Elementor (mais flexível), Framer ou Webflow (mais rápidos e bonitos). Evite páginas lentas e cheias de plugins.' },
      { t: '3. Dobra principal (topo)', d: `Título com a promessa ("${priorityOffer} em ${cityName} com..."), subtítulo para quem é, foto/vídeo real e botão "Falar no WhatsApp" ou "Pedir orçamento".` },
      { t: '4. Prova logo em seguida', d: 'Nota no Google, nº de clientes atendidos, anos de mercado, logos de clientes ou selos.' },
      { t: '5. Problema e desejo', d: 'Mostre que você entende a dor do cliente e o resultado que ele quer.' },
      { t: '6. Como funciona (3 passos)', d: 'Ex.: 1. Você chama no WhatsApp → 2. Fazemos a avaliação/orçamento → 3. Entregamos o resultado.' },
      { t: '7. Benefícios e diferenciais', d: 'Os 3 diferenciais da ficha da oferta, com ícones e frases curtas.' },
      { t: '8. Depoimentos e cases', d: 'De 3 a 6 depoimentos com nome e foto; se possível, vídeo e antes/depois.' },
      { t: '9. FAQ com 6 a 8 perguntas', d: 'Responda as objeções: preço, prazo, garantia, forma de pagamento, área de atendimento.' },
      { t: '10. CTA final + formulário de qualificação', d: 'Repita o botão. Formulário curto (nome, WhatsApp, serviço, urgência). Rodapé com endereço, CNPJ e mapa.' },
      { t: '11. Técnico', d: 'Pensado primeiro para celular, carregando em menos de 3 segundos, botão flutuante de WhatsApp, Pixel e GA4 instalados.' },
      { t: '12. Teste antes de anunciar', d: 'Peça para 5 pessoas abrirem no celular e dizerem em 5 segundos o que você vende. Se não souberem, reescreva o título.' },
    ],
    deliverables: ['Landing page publicada no domínio próprio', 'Formulário integrado ao CRM/WhatsApp', 'Rastreamento funcionando'], tools: ['registro.br', 'WordPress + Elementor', 'Framer', 'Webflow', 'PageSpeed Insights'],
    mistakes: ['Página com vários serviços competindo', 'Título genérico ("Bem-vindo à nossa empresa")', 'Formulário com campos demais', 'Mandar anúncio para a home do site'] });

  A.push({ id: 'form', title: 'Criar formulário de qualificação', reason: 'Separa curiosos de compradores e permite priorizar quem está pronto para comprar.', stage: 'acao', pillar: 'vendas', phase: '30d', impact: 7, effort: 2, urgency: 6,
    owner: 'Comercial', kpi: '% de leads qualificados', time: '1 dia', cost: 'R$ 0',
    steps: [
      { t: 'Use as perguntas sugeridas na aba "Canais e captação"', d: 'No máximo 5 a 7 perguntas — cada campo a mais reduz o envio.' },
      { t: 'Defina a regra de pontuação', d: 'Quente: urgência alta + orçamento compatível + decisor. Morno: falta 1 critério. Frio: só pesquisando.' },
      { t: 'Roteie o atendimento', d: 'Quente: ligação em até 5 min. Morno: WhatsApp no mesmo dia. Frio: nutrição e remarketing.' },
    ], deliverables: ['Formulário no site e no anúncio', 'Regra quente/morno/frio'] });

  if (isLocal) A.push({ id: 'gmn', title: 'Otimizar o Google Meu Negócio e as avaliações', reason: `Para quem atende ${cityName} e região, é a vitrine de maior confiança e menor custo.`, stage: 'consideracao', pillar: 'marketing', phase: '30d', impact: 8, effort: 3, urgency: 6,
    owner: 'Marketing', kpi: 'Nº de avaliações e nota média', time: '2 dias + rotina', cost: 'R$ 0',
    steps: [
      { t: 'Reivindique e verifique o perfil', d: 'business.google.com — confirme endereço ou área de atendimento.' },
      { t: 'Complete 100% do perfil', d: 'Categoria principal correta + secundárias, serviços com descrição, horário, telefone, site com UTM, área de atendimento.' },
      { t: 'Suba 20+ fotos reais', d: 'Fachada, equipe, trabalhos realizados, antes/depois. Atualize todo mês.' },
      { t: 'Crie a rotina de avaliações', d: 'Envie o link de avaliação para TODO cliente atendido, no momento de maior satisfação. Meta: 4 a 8 novas por mês.' },
      { t: 'Responda todas as avaliações', d: 'Inclusive as negativas, com educação e solução.' },
      { t: 'Publique 1 post por semana', d: 'Ofertas, cases, dicas e novidades.' },
    ], deliverables: ['Perfil 100% completo', 'Link curto de avaliação', 'Rotina semanal'], tools: ['Google Perfil da Empresa'] });

  A.push({ id: 'prova', title: 'Estruturar prova social (depoimentos e cases)', reason: 'É o que transforma interesse em confiança na etapa de consideração.', stage: 'consideracao', pillar: 'marketing', phase: '30d', impact: 7, effort: 3, urgency: 5,
    owner: 'Marketing', kpi: 'Nº de depoimentos publicados', time: '2 a 3 semanas', cost: 'R$ 0',
    steps: [
      { t: 'Liste 20 clientes satisfeitos', d: 'Priorize casos parecidos com o cliente que você quer atrair.' },
      { t: 'Peça o depoimento com roteiro', d: 'Perguntas: Como era antes? Por que escolheu a gente? Como foi a experiência? Qual o resultado? Recomendaria?' },
      { t: 'Grave em vídeo curto (30–60s)', d: 'Celular na horizontal, luz natural, áudio limpo. Legende sempre.' },
      { t: 'Monte 3 cases completos', d: 'Problema → solução → resultado em números → foto/vídeo.' },
      { t: 'Distribua', d: 'Destaques do Instagram, seção no site, anúncios de remarketing e mensagem de follow-up (dia 3).' },
    ], deliverables: ['10 depoimentos', '3 cases', 'Destaque "Clientes" no Instagram'] });

  if (recommendation === 'GOOGLE_FIRST' || recommendation === 'BOTH') A.push({ id: 'google', title: 'Lançar campanha de Google Search', reason: 'Seu cliente procura ativamente pelo serviço — capturar essa demanda é o caminho mais curto até a venda.', stage: 'descoberta', pillar: 'marketing', phase: '30d', impact: 9, effort: 5, urgency: 7,
    owner: 'Tráfego / Vortex', kpi: 'Custo por lead qualificado e custo por venda', time: '3 a 5 dias para estruturar', cost: `${brl(split.google)}/mês de mídia (sugestão inicial)`,
    steps: [
      { t: 'Pesquise palavras-chave no Planejador do Google', d: `Termos de intenção de compra: "${offerLow} ${cityName.toLowerCase()}", "${offerLow} preço", "${offerLow} perto de mim", "empresa de ${offerLow}".` },
      { t: 'Estruture a campanha', d: '1 campanha de Pesquisa, 2 a 4 grupos de anúncios por intenção (serviço, preço/orçamento, urgência, região).' },
      { t: 'Use correspondência de frase e exata', d: 'Evite correspondência ampla no início para não pagar por buscas irrelevantes.' },
      { t: 'Crie a lista de palavras negativas', d: 'grátis, curso, emprego, vaga, como fazer, DIY, usado, barato demais, etc.' },
      { t: 'Escreva anúncios responsivos', d: '15 títulos e 4 descrições com a promessa, diferenciais, cidade e CTA. Adicione sitelinks, chamada, local e frases de destaque.' },
      { t: 'Segmentação e orçamento', d: `${isLocal ? `Raio de atendimento em torno de ${cityName}` : 'Regiões atendidas'}; orçamento diário = mensal ÷ 30,4; horário comercial reforçado.` },
      { t: 'Lances', d: 'Comece com "Maximizar cliques" com limite de CPC; após ~30 conversões, mude para "Maximizar conversões".' },
      { t: 'Otimização semanal', d: 'Revise termos de pesquisa, negative o que não vende, pause anúncios fracos e compare custo por lead qualificado.' },
    ], deliverables: ['Campanha de Pesquisa ativa', 'Lista de negativas', 'Relatório semanal'], tools: ['Google Ads', 'Planejador de Palavras-chave'],
    mistakes: ['Deixar a Performance Max decidir tudo no começo', 'Não negativar termos', 'Mandar o clique para a home'] });

  if (recommendation === 'META_FIRST' || recommendation === 'BOTH') A.push({ id: 'meta', title: 'Lançar campanhas no Meta Ads', reason: 'A oferta tem apelo visual e o público é bem segmentável — dá para gerar demanda nova.', stage: 'atencao', pillar: 'marketing', phase: '30d', impact: 9, effort: 5, urgency: 7,
    owner: 'Tráfego / Vortex', kpi: 'CPL e custo por lead qualificado', time: '3 a 5 dias para estruturar', cost: `${brl(split.meta)}/mês de mídia (sugestão inicial)`,
    steps: [
      { t: 'Organize o Business Manager', d: 'Conta de anúncios, página do Facebook, Instagram, Pixel e domínio verificados, forma de pagamento configurada.' },
      { t: 'Campanha de captação', d: 'Objetivo "Leads" (formulário instantâneo com perguntas de qualificação) ou "Engajamento → Mensagens no WhatsApp".' },
      { t: 'Público', d: `${isLocal ? `Localização: ${cityName} + raio de atendimento` : 'Regiões atendidas'}, idade do cliente ideal. Comece com público aberto (Advantage+) — o criativo faz a segmentação.` },
      { t: 'Suba 3 a 5 criativos', d: 'Vídeo curto (15–30s), carrossel de antes/depois e um estático com a oferta. Cada um com um ângulo diferente.' },
      { t: 'Remarketing', d: 'Campanha separada para quem visitou o site, engajou no Instagram ou abriu o formulário, com depoimentos e quebra de objeções.' },
      { t: 'Regras de otimização', d: 'Espere gastar ~2× o CPL alvo por anúncio antes de julgar. Pause criativos com CPL 50% acima da meta e duplique os vencedores.' },
    ], deliverables: ['Campanha de captação ativa', 'Campanha de remarketing', 'Relatório semanal de CPL'], tools: ['Meta Ads Manager', 'Biblioteca de Anúncios (pesquisar concorrentes)'],
    mistakes: ['Usar o botão "Impulsionar"', 'Segmentar demais o público', 'Rodar o mesmo criativo por meses'] });

  if (recommendation === 'FIX_FOUNDATION_FIRST') A.push({ id: 'pausa', title: 'Segurar aumento de mídia até a fundação estar pronta', reason: 'Mais leads agora seriam desperdiçados no processo atual.', stage: 'acao', pillar: 'vendas', phase: '7d', impact: 8, effort: 1, urgency: 9,
    owner: 'Sócio', kpi: 'Conversão lead → venda', time: '30 dias', cost: 'R$ 0',
    steps: [{ t: 'Mantenha o investimento atual' }, { t: 'Conclua CRM, SLA de resposta e follow-up' }, { t: 'Reavalie a mídia em 30 dias com a nova taxa de conversão' }], deliverables: ['Fundação comercial pronta'] });

  A.push({ id: 'criativos', title: 'Rotina de criação e teste de criativos', reason: 'O criativo é o principal fator de custo por lead nas plataformas.', stage: 'atencao', pillar: 'marketing', phase: '90d', impact: 8, effort: 4, urgency: 5,
    owner: 'Marketing', kpi: 'CTR e CPL por criativo', time: 'Rotina semanal', cost: 'R$ 0 a R$ 2.000/mês',
    steps: [
      { t: 'Defina 5 ângulos', d: 'Dor ("cansado de..."), desejo (resultado), prova (depoimento), oferta (condição) e autoridade (bastidores/anos de mercado).' },
      { t: 'Escreva ganchos para os 3 primeiros segundos', d: 'Pergunta direta, número, antes/depois ou uma afirmação forte.' },
      { t: 'Produza em lote', d: '1 dia por mês gravando 10–15 vídeos curtos. Formato vertical 9:16, legendado.' },
      { t: 'Teste 3 a 5 novos criativos por semana', d: 'Nomeie com padrão (ângulo_formato_data) para comparar.' },
      { t: 'Escale vencedores e pause perdedores a cada 7 dias' },
    ], deliverables: ['Banco de criativos', 'Planilha de testes'], tools: ['CapCut', 'Canva', 'Celular + microfone de lapela'] });

  A.push({ id: 'comercial', title: 'Roteiro de vendas e treinamento do time', reason: 'Subir a conversão reduz diretamente o investimento necessário para a meta.', stage: 'acao', pillar: 'vendas', phase: has('conversao') ? '30d' : '90d', impact: has('conversao') ? 9 : 7, effort: 4, urgency: has('conversao') ? 8 : 5,
    owner: 'Comercial / Vortex', kpi: 'Taxa de fechamento', time: '2 semanas + rotina', cost: 'R$ 0',
    steps: [
      { t: 'Abertura', d: 'Apresente-se, agradeça o contato e peça permissão para fazer algumas perguntas.' },
      { t: 'Diagnóstico (antes do preço)', d: 'Qual a situação hoje? O que te fez buscar agora? Para quando precisa? Já fez orçamento em outro lugar? Quem decide junto?' },
      { t: 'Apresentação da solução', d: 'Conecte cada diferencial ao que o cliente falou no diagnóstico.' },
      { t: 'Proposta', d: 'Valor + condição + prazo + garantia. Envie por escrito e confirme o recebimento.' },
      { t: 'Objeções', d: 'Use as respostas da ficha da oferta. "Vou pensar" → "Claro! O que ficou faltando para você decidir?"' },
      { t: 'Fechamento e próximo passo', d: 'Sempre termine com data e hora do próximo contato.' },
      { t: 'Treino semanal (30 min)', d: 'Simulação de atendimento entre o time e análise de 2 conversas reais.' },
    ], deliverables: ['Script de atendimento', 'Banco de respostas para objeções', 'Ritual de treino semanal'] });

  A.push({ id: 'planejamento', title: 'Planejamento comercial com metas reversas', reason: 'Transformar a meta de faturamento em metas semanais e diárias que o time consegue acompanhar.', stage: 'acao', pillar: 'indicadores', phase: '30d', impact: 8, effort: 2, urgency: 6,
    owner: 'Gestão', kpi: 'Meta x realizado semanal', time: '1 dia', cost: 'R$ 0',
    steps: [
      { t: 'Meta mensal', d: `${brl(targetRevenue)}/mês → ${totalSalesNeeded} vendas (ticket ${brl(ticket)}).` },
      { t: 'Vendas novas por mídia', d: `+${additionalSales} vendas/mês → ${funnel.proposals} orçamentos → ${funnel.mql} leads qualificados → ${requiredLeads} leads.` },
      { t: 'Quebre por semana', d: `≈ ${Math.ceil(requiredLeads / 4.3)} leads novos e ${Math.ceil(funnel.proposals / 4.3)} orçamentos por semana.` },
      { t: 'Quebre por dia útil', d: `≈ ${Math.ceil(requiredLeads / 22)} leads e ${Math.ceil(funnel.proposals / 22)} orçamento(s) por dia.` },
      { t: 'Acompanhe toda segunda-feira', d: 'Se a semana ficou abaixo, descubra em qual etapa do funil está a perda.' },
    ], deliverables: ['Metas por mês, semana e dia'] });

  A.push({ id: 'dashboard', title: 'Painel de indicadores', reason: 'O que não é medido não é gerenciado.', stage: 'acao', pillar: 'indicadores', phase: '30d', impact: 7, effort: 3, urgency: 5,
    owner: 'Gestão', kpi: 'Painel atualizado semanalmente', time: '2 dias', cost: 'R$ 0',
    steps: [
      { t: 'Crie a planilha/painel', d: 'Colunas por semana: investimento, leads, CPL, leads qualificados, orçamentos, vendas, faturamento, CAC, ROAS.' },
      { t: 'Separe por origem', d: 'Google, Meta, indicação, orgânico — para saber o que realmente vende.' },
      { t: 'Atualize toda semana e compare com a meta reversa' },
    ], deliverables: ['Painel semanal'], tools: ['Google Planilhas', 'Looker Studio'] });

  A.push({ id: 'remarketing', title: 'Remarketing e nutrição', reason: 'A maioria das pessoas não compra no primeiro contato.', stage: 'consideracao', pillar: 'marketing', phase: '90d', impact: 6, effort: 3, urgency: 4,
    owner: 'Tráfego', kpi: 'Conversões assistidas', time: '2 dias', cost: '10% a 20% da verba de mídia',
    steps: [{ t: 'Crie públicos', d: 'Visitantes do site (30 dias), engajados no Instagram (60 dias), leads não convertidos.' }, { t: 'Anúncios com depoimentos, cases e FAQ' }, { t: 'Lista de transmissão no WhatsApp com conteúdo útil a cada 15 dias' }],
    deliverables: ['Campanha de remarketing'] });

  A.push({ id: 'cac', title: 'Validar CAC e realocar verba', reason: 'Depois de 60–90 dias de dados, o plano é recalculado com números reais.', stage: 'atencao', pillar: 'indicadores', phase: '90d', impact: 8, effort: 2, urgency: 4,
    owner: 'Gestão / Vortex', kpi: 'CAC por canal', time: '1 dia por mês', cost: 'R$ 0',
    steps: [{ t: 'Calcule o CAC real por canal', d: 'Investimento total do canal ÷ vendas vindas dele.' }, { t: `Compare com o CAC máximo (${brl(maxCac)})` }, { t: 'Mova verba para o canal mais eficiente e atualize o diagnóstico no VTX.GROW' }],
    deliverables: ['CAC por canal', 'Novo diagnóstico com dados reais'] });

  A.push({ id: 'reativacao', title: 'Campanha de reativação de base', reason: 'Ex-clientes e leads perdidos são a aquisição mais barata que existe.', stage: 'relacionamento', pillar: 'vendas', phase: '90d', impact: 7, effort: 2, urgency: 4,
    owner: 'Comercial', kpi: 'Vendas de reativação', time: '3 dias', cost: 'R$ 0',
    steps: [
      { t: 'Exporte ex-clientes e leads perdidos dos últimos 12 meses' },
      { t: 'Crie uma oferta de retorno com prazo', d: 'Ex.: condição especial para quem já é cliente, revisão, manutenção ou upgrade.' },
      { t: 'Dispare em lotes pelo WhatsApp', d: 'Mensagem pessoal, sem cara de spam: "Oi, [nome]! Lembrei de você porque..."' },
      { t: 'Faça follow-up em 48h com quem não respondeu' },
    ], deliverables: ['Lista segmentada', 'Mensagem de reativação'] });

  A.push({ id: 'indicacao', title: 'Programa de indicação', reason: 'Clientes satisfeitos trazem novos clientes com o menor custo possível.', stage: 'relacionamento', pillar: 'marketing', phase: '90d', impact: 7, effort: 3, urgency: 4,
    owner: 'Comercial / Sucesso', kpi: 'Vendas por indicação', time: '1 semana', cost: 'Recompensa por venda gerada',
    steps: [
      { t: 'Defina a recompensa', d: 'Para quem indica (desconto, brinde, serviço) e para o indicado (condição de boas-vindas).' },
      { t: 'Escolha o momento certo', d: 'Peça a indicação logo após a entrega, quando a satisfação está no auge.' },
      { t: 'Facilite', d: 'Mensagem pronta para o cliente encaminhar + link/cupom com o nome dele.' },
      { t: 'Registre no CRM', d: 'Origem "Indicação de [cliente]" para pagar a recompensa e medir o programa.' },
    ], deliverables: ['Regulamento simples', 'Mensagem pronta de indicação'] });

  A.push({ id: 'experiencia', title: 'Experiência do cliente e pós-venda', reason: 'Experiência gera recompra, avaliação e indicação.', stage: 'relacionamento', pillar: 'vendas', phase: '90d', impact: 6, effort: 3, urgency: 3,
    owner: 'Operação', kpi: 'NPS e nº de avaliações', time: '1 semana', cost: 'R$ 0',
    steps: [{ t: 'Mensagem de boas-vindas e alinhamento de expectativa' }, { t: 'Contato no meio da entrega para atualizar o cliente' }, { t: 'Pesquisa NPS após a entrega', d: '"De 0 a 10, quanto você nos recomendaria?"' }, { t: 'Notas 9–10: peça avaliação no Google e indicação. Notas até 6: ligue e resolva.' }],
    deliverables: ['Roteiro de pós-venda', 'Pesquisa NPS'] });

  A.push({ id: 'recompra', title: 'Recompra, upsell e cross-sell', reason: 'Aumenta o valor de cada cliente e melhora a economia da aquisição.', stage: 'relacionamento', pillar: 'vendas', phase: '12m', impact: 7, effort: 4, urgency: 3,
    owner: 'Comercial', kpi: 'LTV / ticket médio', time: 'Contínuo', cost: 'R$ 0',
    steps: [{ t: 'Mapeie a próxima compra natural do cliente', d: 'Manutenção, revisão, complemento, upgrade.' }, { t: 'Ofereça no pós-venda', d: a.q10 && a.q10 !== UNKNOWN ? `Avalie oferecer "${a.q10}" (maior margem) como complemento.` : 'Ofereça o produto de maior margem como complemento.' }, { t: 'Crie um calendário de contato com a base' }],
    deliverables: ['Mapa de recompra', 'Calendário da base'] });

  A.push({ id: 'conteudo', title: 'Conteúdo e SEO para reduzir o CAC', reason: 'Conteúdo que responde dúvidas atrai clientes de graça no longo prazo.', stage: 'descoberta', pillar: 'marketing', phase: '12m', impact: 6, effort: 6, urgency: 2,
    owner: 'Marketing', kpi: 'Leads orgânicos', time: 'Contínuo', cost: 'R$ 0 a R$ 1.500/mês',
    steps: [{ t: 'Liste as 20 perguntas que os clientes mais fazem' }, { t: 'Publique 1 conteúdo por semana', d: 'Artigo no site + versão em vídeo/carrossel no Instagram.' }, { t: `Crie páginas por serviço e por cidade`, d: `Ex.: "${priorityOffer} em ${cityName}".` }],
    deliverables: ['Calendário de conteúdo', 'Páginas de serviço'] });

  let critCount = 0;
  const actions: ActionItem[] = A.map(x => ({ ...x, score: r(x.impact * 4 + x.urgency * 3.5 + (10 - x.effort) * 2.5), priority: 'BAIXA' as Priority }))
    .sort((x, y) => y.score - x.score)
    .map(x => {
      let p: Priority = x.score >= 80 ? 'CRÍTICA' : x.score >= 68 ? 'ALTA' : x.score >= 55 ? 'MÉDIA' : 'BAIXA';
      if (p === 'CRÍTICA') { critCount++; if (critCount > 3) p = 'ALTA'; }
      return { ...x, priority: p };
    });

  const roadmap = [
    { phase: 'Fundação', months: 'Mês 1–2', focus: 'Oferta, processo comercial, rastreamento e landing page.', items: actions.filter(x => x.phase === '7d' || x.phase === '30d').slice(0, 5).map(x => x.title) },
    { phase: 'Validação', months: 'Mês 3–4', focus: 'Validar canal, CPL e conversão com orçamento de teste.', items: ['Testes de criativos e públicos', 'Ajustes da landing page', 'Primeiro cálculo de CAC real'] },
    { phase: 'Escala', months: 'Mês 5–8', focus: 'Aumentar investimento no que provou funcionar.', items: ['Escalar canal vencedor', 'Abrir segundo canal', 'Remarketing completo'] },
    { phase: 'Eficiência', months: 'Mês 9–10', focus: 'Reduzir CAC e aumentar conversão.', items: ['Automações de follow-up', 'Treinamento contínuo', 'Conteúdo e SEO'] },
    { phase: 'Retenção', months: 'Mês 11–12', focus: 'Recompra, indicação e LTV.', items: ['Programa de indicação', 'Upsell/cross-sell', 'Reativação de base'] },
  ];

  const kpis = [
    { name: 'Investimento total', why: 'Mídia + estrutura', target: `${brl(investmentBase)}/mês (cenário base)` },
    { name: 'Leads novos', why: 'Volume de demanda', target: `+${requiredLeads}/mês` },
    { name: 'CPL (custo por lead)', why: 'Eficiência da mídia', target: `${brl(cplRange[0])} – ${brl(cplRange[1])}` },
    { name: 'Leads qualificados', why: 'Qualidade da demanda', target: `${pct(leadToMql)} dos leads` },
    { name: 'Tempo de 1ª resposta', why: 'Velocidade do comercial', target: 'Até 5 minutos' },
    { name: 'Conversão lead → venda', why: 'Eficiência comercial', target: `${pct(closeRate)} (mercado: ${pct(cMin)}–${pct(cMax)})` },
    { name: 'Vendas', why: 'Resultado', target: `${totalSalesNeeded}/mês` },
    { name: 'CAC', why: 'Saúde da aquisição', target: `Abaixo de ${brl(maxCac)}` },
    { name: 'Faturamento', why: 'Meta final', target: `${brl(targetRevenue)}/mês` },
  ];

  const qualificationForm = [
    'Nome e WhatsApp',
    'Cidade / bairro (para checar área de atendimento)',
    `Qual serviço você procura? (com "${priorityOffer}" como primeira opção)`,
    'Para quando você precisa? (Urgente / Este mês / Próximos 3 meses / Só pesquisando)',
    'Qual faixa de investimento você considera? (faixas próximas ao ticket médio)',
    ref.b2b > .5 ? 'Qual o tamanho da sua empresa e seu cargo?' : 'Você é quem decide a compra?',
    'Como conheceu a empresa? (origem do lead)',
  ];

  return {
    engineVersion: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    company: { name: a.q1 || 'Sua empresa', segment, city, scope, priorityOffer, age: a.q7 || '' },
    confidence, assumptions,
    maturity: { score: overall, level: ml.level, levelKey: ml.key },
    pillars, journey, mainStage, mainPillar,
    market: { closeRange: ref.close, cplRange: ref.cpl, observedClose },
    financial: {
      currentRevenue, targetRevenue, gap, gapPct, months, ticket, margin: margin as number, marginIsHyp, grossProfitPerSale,
      currentSales, additionalSales, totalSalesNeeded, capacity, capacityOk, currentLeads, closeRate, closeIsHyp, requiredLeads, totalLeadsNeeded,
      cplBase, cplIsHyp, cplRange, media, structure, investmentBase, investmentRange, willingness, feasibility, cacBase, maxCac, economicsOk, currentMkt, currentCpl,
      achievableWithBudget, funnel, ramp,
    },
    scenarios, budgetScenarios,
    channels: { google, meta, commercialCapacity, recommendation, headline, reason, split, phase2 },
    communication: { score: commScore, items: comm },
    bottlenecks: B, opportunities, actions, roadmap, kpis, qualificationForm,
  };
}

// ---------------------------------------------------------------------------
// Fit comercial para a Vortex — visível APENAS no painel administrativo.
// ---------------------------------------------------------------------------
export function commercialFit(_a: Answers, an: Analysis): { score: number; label: string; reasons: string[] } {
  const reasons: string[] = [];
  const rev = an.financial.currentRevenue;
  const revScore = rev >= 200000 ? 1 : rev >= 80000 ? .85 : rev >= 30000 ? .65 : rev >= 10000 ? .4 : .2;
  const w = an.financial.willingness;
  const invScore = w >= 10000 ? 1 : w >= 5000 ? .8 : w >= 2500 ? .6 : w >= 1000 ? .35 : .1;
  const months = an.financial.months;
  const urgency = months <= 3 ? 1 : months <= 6 ? .8 : months <= 12 ? .55 : .3;
  const growth = clamp(an.financial.gapPct / 1.5);
  const problemMatch = clamp(an.bottlenecks.filter(b => ['followup', 'crm', 'demanda', 'site', 'midia', 'conversao', 'resposta', 'dependencia'].includes(b.id)).length / 4);
  const capacity = an.financial.capacityOk ? 1 : .5;
  if (revScore >= .65) reasons.push(`Faturamento de ${brl(rev)}/mês`);
  if (invScore >= .6) reasons.push(`Disposto a investir ${brl(w)}/mês`);
  if (urgency >= .8) reasons.push(`Prazo curto (${months} meses)`);
  if (problemMatch >= .5) reasons.push('Gargalos alinhados aos serviços Vortex');
  if (growth >= .5) reasons.push(`Meta de crescimento de ${Math.round(an.financial.gapPct * 100)}%`);
  const score = Math.round((.25 * revScore + .25 * invScore + .15 * urgency + .15 * growth + .15 * problemMatch + .05 * capacity) * 100);
  const label = score >= 70 ? 'Quente' : score >= 45 ? 'Morno' : 'Frio';
  return { score, label, reasons };
}
