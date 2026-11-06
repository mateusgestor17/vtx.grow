// Questionário oficial VTX.GROW — 30 perguntas (versão 1)

export type QType = 'text' | 'textarea' | 'select' | 'multi' | 'currency' | 'number' | 'percent' | 'url' | 'citystate';

export interface Question {
  id: string;
  n: number;
  label: string;
  help?: string;
  type: QType;
  options?: string[];
  allowOther?: boolean;
  allowUnknown?: boolean;
  noneLabel?: string;
  placeholder?: string;
  optional?: boolean;
  suffix?: string;
}

export const UNKNOWN = '__unknown__';
export const NONE = '__none__';
export const QUESTIONNAIRE_VERSION = 1;

export const SEGMENTS = [
  'Esquadrias de alumínio',
  'Vidraçaria',
  'Esquadrias e vidraçaria',
  'Box e espelhos',
  'Serralheria com vidro',
  'Outro',
];

export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export const CHANNELS = [
  'Indicação / boca a boca',
  'Instagram orgânico',
  'Google orgânico / Google Maps',
  'Google Ads',
  'Meta Ads (Instagram/Facebook)',
  'WhatsApp / lista de contatos',
  'Prospecção ativa',
  'Parcerias',
  'Loja física / passagem',
  'Marketplaces',
  'Eventos / feiras',
  'Outros',
];

export const Q: Record<string, Question> = {
  q1: { id: 'q1', n: 1, type: 'text', label: 'Qual é o nome da sua empresa?', placeholder: 'Ex.: Clínica Sorriso Vivo' },
  q2: { id: 'q2', n: 2, type: 'select', label: 'Qual é o principal segmento da sua empresa?', options: SEGMENTS, allowOther: true },
  q3: { id: 'q3', n: 3, type: 'citystate', label: 'Em qual cidade e estado sua empresa está localizada?' },
  q4: { id: 'q4', n: 4, type: 'select', label: 'Sua empresa atende apenas sua cidade, sua região, vários estados ou todo o Brasil?', options: ['Apenas minha cidade', 'Minha região', 'Vários estados', 'Todo o Brasil'] },
  q5: { id: 'q5', n: 5, type: 'url', label: 'Qual é o site da sua empresa?', placeholder: 'www.suaempresa.com.br', noneLabel: 'Ainda não tenho site' },
  q6: { id: 'q6', n: 6, type: 'text', label: 'Qual é o Instagram da sua empresa?', placeholder: '@suaempresa', noneLabel: 'Não tenho Instagram' },
  q7: { id: 'q7', n: 7, type: 'select', label: 'Há quanto tempo sua empresa está em operação?', options: ['Menos de 1 ano', '1 a 3 anos', '3 a 5 anos', '5 a 10 anos', 'Mais de 10 anos'] },

  q8: { id: 'q8', n: 8, type: 'textarea', label: 'Quais são os principais produtos ou serviços que sua empresa vende?', placeholder: 'Liste os principais, um por linha' },
  q9: { id: 'q9', n: 9, type: 'text', label: 'Qual desses produtos ou serviços mais vende hoje?' },
  q10: { id: 'q10', n: 10, type: 'text', label: 'Qual desses produtos ou serviços possui a maior margem de lucro?', allowUnknown: true },
  q11: { id: 'q11', n: 11, type: 'text', label: 'Qual produto ou serviço você mais deseja vender nos próximos meses?', help: 'Ele será o foco do plano de captação.' },
  q12: { id: 'q12', n: 12, type: 'currency', label: 'Qual é o ticket médio desse produto ou serviço prioritário?', help: 'Valor médio que o cliente paga em uma compra.' },
  q13: { id: 'q13', n: 13, type: 'percent', label: 'Qual é aproximadamente a margem desse produto ou serviço?', help: 'Quanto sobra, em %, depois dos custos diretos.', allowUnknown: true, suffix: '%' },
  q14: { id: 'q14', n: 14, type: 'number', label: 'Quantos novos clientes sua empresa consegue atender por mês sem comprometer a qualidade?', suffix: 'clientes/mês' },

  q15: { id: 'q15', n: 15, type: 'currency', label: 'Qual foi aproximadamente o faturamento da empresa no último mês?' },
  q16: { id: 'q16', n: 16, type: 'currency', label: 'Qual é o faturamento médio mensal da empresa nos últimos 3 meses?' },
  q17: { id: 'q17', n: 17, type: 'currency', label: 'Qual faturamento mensal você deseja alcançar?' },
  q18: { id: 'q18', n: 18, type: 'select', label: 'Em quanto tempo você deseja alcançar essa meta?', options: ['3 meses', '6 meses', '12 meses', '24 meses'] },

  q19: { id: 'q19', n: 19, type: 'select', label: 'Qual é hoje o principal obstáculo que impede sua empresa de crescer?', allowOther: true, options: [
    'Poucos clientes chegando (pouca demanda)',
    'Chegam contatos, mas pouco qualificados',
    'Chegam contatos, mas vendemos pouco',
    'Falta de processo comercial / equipe de vendas',
    'Marca pouco conhecida',
    'Concorrência e guerra de preço',
    'Falta de tempo / gestão sobrecarregada',
    'Não sei quais números acompanhar',
    'Outro',
  ] },
  q20: { id: 'q20', n: 20, type: 'textarea', label: 'Quem é o principal tipo de cliente que compra de você?', placeholder: 'Ex.: mulheres de 30 a 50 anos, classe B, que buscam... / empresas de 10 a 50 funcionários do setor...' },
  q21: { id: 'q21', n: 21, type: 'multi', label: 'De onde vêm a maioria dos seus clientes atualmente?', help: 'Pode marcar mais de uma opção.', options: CHANNELS },
  q22: { id: 'q22', n: 22, type: 'select', label: 'Qual canal hoje gera mais vendas para sua empresa?', options: CHANNELS },

  q23: { id: 'q23', n: 23, type: 'currency', label: 'Quanto sua empresa investe atualmente por mês em marketing?', help: 'Some anúncios, agência, ferramentas e produção. Se não investe, coloque 0.' },
  q24: { id: 'q24', n: 24, type: 'select', label: 'Você utiliza ou já utilizou Meta Ads, Google Ads ou os dois?', options: ['Nunca utilizei', 'Já utilizei, mas parei', 'Uso Meta Ads', 'Uso Google Ads', 'Uso os dois'] },
  q25: { id: 'q25', n: 25, type: 'number', label: 'Quantos leads, contatos ou pedidos de orçamento sua empresa recebe aproximadamente por mês?', allowUnknown: true, suffix: 'por mês' },

  q26: { id: 'q26', n: 26, type: 'number', label: 'Quantas vendas ou novos clientes sua empresa fecha aproximadamente por mês?', allowUnknown: true, suffix: 'por mês' },
  q27: { id: 'q27', n: 27, type: 'select', label: 'Quanto tempo sua empresa leva, em média, para responder um novo lead?', options: ['Menos de 5 minutos', 'Até 1 hora', 'Até 4 horas', 'No mesmo dia', 'Até 24 horas', 'Mais de 24 horas', 'Não sei'] },
  q28: { id: 'q28', n: 28, type: 'select', label: 'Como sua empresa organiza hoje os leads e oportunidades comerciais?', options: ['Não organizamos', 'Caderno / memória', 'WhatsApp (etiquetas e conversas)', 'Planilha', 'CRM'] },
  q29: { id: 'q29', n: 29, type: 'select', label: 'Sua empresa possui processo de follow-up para quem pediu orçamento ou demonstrou interesse e não comprou?', options: ['Não', 'Às vezes, sem padrão', 'Sim, manual com cadência definida', 'Sim, automatizado'] },

  q30: { id: 'q30', n: 30, type: 'currency', label: 'Quanto sua empresa está disposta a investir mensalmente para alcançar a meta de crescimento informada?', help: 'Considere mídia + estrutura. É um teto, não um compromisso.' },
};

export interface Step { key: string; title: string; subtitle: string; ids: string[] }

export const STEPS: Step[] = [
  { key: 'empresa', title: 'Sua empresa', subtitle: 'Quem é, onde está e onde aparece.', ids: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'] },
  { key: 'oferta', title: 'Produtos e oferta', subtitle: 'O que você vende e quanto vale cada venda.', ids: ['q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14'] },
  { key: 'numeros', title: 'Números e meta', subtitle: 'Onde você está e onde quer chegar.', ids: ['q15', 'q16', 'q17', 'q18'] },
  { key: 'clientes', title: 'Clientes e canais', subtitle: 'Quem compra e de onde vem.', ids: ['q19', 'q20', 'q21', 'q22'] },
  { key: 'marketing', title: 'Marketing', subtitle: 'Investimento e geração de demanda.', ids: ['q23', 'q24', 'q25'] },
  { key: 'vendas', title: 'Processo comercial', subtitle: 'Como os contatos viram clientes.', ids: ['q26', 'q27', 'q28', 'q29'] },
  { key: 'investimento', title: 'Investimento', subtitle: 'Último passo antes do seu plano.', ids: ['q30'] },
];

export type Answers = Record<string, any>;

export function isAnswered(q: Question, a: Answers): boolean {
  const v = a[q.id];
  if (v === UNKNOWN || v === NONE) return true;
  if (q.optional) return true;
  switch (q.type) {
    case 'multi': return Array.isArray(v) && v.length > 0;
    case 'citystate': return !!(a.q3_city && String(a.q3_city).trim()) && !!a.q3_uf;
    case 'currency': case 'number': case 'percent': return v !== undefined && v !== null && v !== '' && !isNaN(Number(v));
    case 'select': return !!v && (v !== 'Outro' || !q.allowOther || !!(a[q.id + '_other'] || '').trim());
    default: return typeof v === 'string' && v.trim().length > 0;
  }
}

export function displayAnswer(q: Question, a: Answers): string {
  const v = a[q.id];
  if (v === UNKNOWN) return 'Não sei';
  if (v === NONE) return q.noneLabel || 'Não possui';
  if (v === undefined || v === null || v === '') return '—';
  switch (q.type) {
    case 'currency': return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    case 'percent': return `${v}%`;
    case 'number': return `${Number(v).toLocaleString('pt-BR')}${q.suffix ? ' ' + q.suffix : ''}`;
    case 'multi': return (v as string[]).join(', ');
    case 'citystate': return `${a.q3_city || ''} - ${a.q3_uf || ''}`;
    case 'select': return v === 'Outro' && a[q.id + '_other'] ? `Outro: ${a[q.id + '_other']}` : String(v);
    default: return String(v);
  }
}
