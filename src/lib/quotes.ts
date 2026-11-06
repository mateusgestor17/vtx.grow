// Cálculos do orçamento. Tudo determinístico: mesmas entradas, mesmo valor no sistema e no PDF.
import { calcPanes, Pane, projectType } from './projects';

export interface QuoteItem {
  id: string;
  type: string;
  environment: string;
  width: number;      // mm
  height: number;     // mm
  panels: number;     // folhas / peças
  qty: number;        // repetições iguais do mesmo item
  glass: string;
  thickness: number;  // mm
  color: string;
  pricePerM2: number;
  hardware: number;   // ferragens / perfis por unidade
  labor: number;      // instalação por unidade
  notes: string;
}

export interface Payment {
  pixDiscountPct: number;
  installments: number;
  interestPct: number;   // ao mês; 0 = sem juros
  downPct: number;       // entrada, em %
}

export interface Quote {
  id: string;
  number: number;
  status: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  client_address: string | null;
  title: string | null;
  items: QuoteItem[];
  payment: Payment;
  discount: number;
  notes: string | null;
  valid_until: string | null;
  simulation_ids: string[];
  total: number;
  created_at: string;
}

export interface BusinessProfile {
  user_id: string;
  company_name: string | null;
  logo_path: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  address: string | null;
  cnpj: string | null;
  warranty: string;
  lead_time: string;
  validity_days: number;
  pix_discount_pct: number;
  max_installments: number;
  differentials: string;
}

export const STATUS: Record<string, { label: string; tag: string }> = {
  rascunho: { label: 'Rascunho', tag: 'gray' },
  enviado: { label: 'Enviado', tag: 'yellow' },
  aprovado: { label: 'Aprovado', tag: 'green' },
  recusado: { label: 'Recusado', tag: 'red' },
};

const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function newItem(type = 'box_correr'): QuoteItem {
  const t = projectType(type);
  return {
    id: crypto.randomUUID(), type, environment: '', width: 1200, height: t.height || 2000, panels: t.panels(1200), qty: 1,
    glass: t.glass, thickness: t.thickness, color: 'preto', pricePerM2: 0, hardware: 0, labor: 0, notes: '',
  };
}

export interface ItemCalc { panes: Pane[]; paneTotal: number; areaUnit: number; areaTotal: number; glassValue: number; unitTotal: number; total: number }

export function calcItem(item: QuoteItem): ItemCalc {
  const panes = calcPanes(projectType(item.type), item.width, item.height, item.panels);
  const qty = Math.max(1, item.qty || 1);
  const areaUnit = panes.reduce((s, p) => s + p.area, 0);
  const glassValue = areaUnit * (item.pricePerM2 || 0);
  const unitTotal = glassValue + (item.hardware || 0) + (item.labor || 0);
  return { panes, paneTotal: panes.length * qty, areaUnit, areaTotal: areaUnit * qty, glassValue, unitTotal, total: cents(unitTotal * qty) };
}

export interface Totals {
  subtotal: number; discount: number; total: number;
  pixTotal: number; pixSavings: number;
  downValue: number; financed: number; installments: number; installmentValue: number; installmentTotal: number; hasInterest: boolean;
  panes: number; area: number;
}

export function calcTotals(items: QuoteItem[], discount: number, p: Payment): Totals {
  const calcs = items.map(calcItem);
  const subtotal = cents(calcs.reduce((s, c) => s + c.total, 0));
  const disc = Math.min(Math.max(discount || 0, 0), subtotal);
  const total = cents(subtotal - disc);
  const pixTotal = cents(total * (1 - (p.pixDiscountPct || 0) / 100));
  const downValue = cents(total * ((p.downPct || 0) / 100));
  const financed = cents(total - downValue);
  const n = Math.max(1, Math.round(p.installments) || 1);
  const i = (p.interestPct || 0) / 100;
  // Tabela Price quando há juros; divisão simples quando não há.
  const installmentValue = cents(i > 0 ? (financed * i) / (1 - Math.pow(1 + i, -n)) : financed / n);
  return {
    subtotal, discount: disc, total, pixTotal, pixSavings: cents(total - pixTotal),
    downValue, financed, installments: n, installmentValue, installmentTotal: cents(downValue + installmentValue * n), hasInterest: i > 0,
    panes: calcs.reduce((s, c) => s + c.paneTotal, 0), area: calcs.reduce((s, c) => s + c.areaTotal, 0),
  };
}

export const defaultPayment = (b?: Partial<BusinessProfile> | null): Payment => ({
  pixDiscountPct: Number(b?.pix_discount_pct ?? 5), installments: Number(b?.max_installments ?? 10), interestPct: 0, downPct: 0,
});

export function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
