export const brl = (n: number | null | undefined) =>
  n === null || n === undefined || isNaN(n) ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const pct = (n: number, d = 1) => `${(n * 100).toLocaleString('pt-BR', { maximumFractionDigits: d })}%`;
export const int = (n: number | null | undefined) => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('pt-BR'));
export const date = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const dateTime = (s: string | null | undefined) => (s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
export const scoreTone = (s: number) => (s >= 70 ? 'good' : s >= 45 ? 'mid' : 'low');
