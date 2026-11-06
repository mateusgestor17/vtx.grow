// Catálogo de projetos de esquadrias e vidraçaria + cálculo das peças de vidro.

export type PaneKind = 'fixo' | 'movel';

export interface ProjectType {
  id: string;
  label: string;
  /** Layout padrão: quantidade de folhas e folga (mm). overlap > 0 = folhas transpassam; < 0 = vão entre peças. */
  panels: (widthMm: number) => number;
  overlap: number;
  sliding?: boolean;
  thickness: number;
  glass: string;
  height?: number;
  benefits: string[];
}

export const PROJECT_TYPES: ProjectType[] = [
  { id: 'box_correr', label: 'Box de correr', panels: () => 2, overlap: 50, sliding: true, thickness: 8, glass: 'temperado_incolor', height: 1900,
    benefits: ['Banheiro mais amplo, claro e fácil de limpar', 'Vidro temperado de segurança', 'Sem cortinas nem água fora da área do box'] },
  { id: 'box_abrir', label: 'Box de abrir', panels: () => 1, overlap: 0, thickness: 8, glass: 'temperado_incolor', height: 1900,
    benefits: ['Visual limpo e sofisticado', 'Abertura ampla para o dia a dia', 'Vidro temperado de segurança'] },
  { id: 'janela_correr', label: 'Janela de correr', panels: w => (w > 1800 ? 4 : 2), overlap: 50, sliding: true, thickness: 6, glass: 'temperado_incolor', height: 1200,
    benefits: ['Mais luz natural e ventilação', 'Acabamento de alumínio de longa duração', 'Abertura suave no dia a dia'] },
  { id: 'janela_maxim', label: 'Janela maxim-ar', panels: () => 1, overlap: 0, thickness: 6, glass: 'temperado_incolor', height: 600,
    benefits: ['Ventilação mesmo em dias de chuva', 'Ideal para banheiros e cozinhas', 'Acabamento de alumínio de longa duração'] },
  { id: 'porta_correr', label: 'Porta de correr', panels: w => (w > 3000 ? 4 : 2), overlap: 50, sliding: true, thickness: 8, glass: 'temperado_incolor', height: 2150,
    benefits: ['Integra os ambientes e amplia a sensação de espaço', 'Muito mais luz natural', 'Vidro temperado de segurança'] },
  { id: 'porta_pivotante', label: 'Porta de vidro pivotante', panels: () => 1, overlap: 0, thickness: 10, glass: 'temperado_incolor', height: 2400,
    benefits: ['Entrada imponente e valorização do imóvel', 'Vidro temperado de segurança', 'Ferragens de alta durabilidade'] },
  { id: 'guarda_corpo', label: 'Guarda-corpo de vidro', panels: w => Math.max(1, Math.ceil(w / 1200)), overlap: -20, thickness: 16, glass: 'laminado_incolor', height: 1100,
    benefits: ['Segurança sem bloquear a vista', 'Visual moderno e leve', 'Vidro laminado: em caso de quebra, os cacos ficam presos'] },
  { id: 'corrimao', label: 'Corrimão com vidro', panels: w => Math.max(1, Math.ceil(w / 1200)), overlap: -20, thickness: 16, glass: 'laminado_incolor', height: 1000,
    benefits: ['Escada mais segura e elegante', 'Mais luz circulando no ambiente', 'Acabamento feito sob medida'] },
  { id: 'envidracamento', label: 'Envidraçamento de sacada', panels: w => Math.max(2, Math.ceil(w / 650)), overlap: 0, sliding: true, thickness: 8, glass: 'temperado_incolor', height: 2400,
    benefits: ['Sacada aproveitada o ano inteiro', 'Proteção contra vento, chuva e poeira', 'Abre por completo quando você quiser'] },
  { id: 'fechamento', label: 'Fechamento fixo de vidro', panels: w => Math.max(1, Math.ceil(w / 1500)), overlap: -5, thickness: 10, glass: 'temperado_incolor', height: 2400,
    benefits: ['Divide os ambientes sem perder luz', 'Sensação de amplitude', 'Vidro temperado de segurança'] },
  { id: 'espelho', label: 'Espelho sob medida', panels: () => 1, overlap: 0, thickness: 4, glass: 'espelho_prata', height: 1500,
    benefits: ['Amplia visualmente o ambiente', 'Corte exato para o seu espaço', 'Acabamento lapidado'] },
  { id: 'fachada', label: 'Fachada de vidro', panels: w => Math.max(1, Math.ceil(w / 1200)), overlap: -5, thickness: 10, glass: 'temperado_incolor', height: 3000,
    benefits: ['Valoriza o imóvel e a sua marca', 'Mais luz e visibilidade', 'Estrutura de alumínio durável'] },
  { id: 'outro', label: 'Outro projeto', panels: () => 1, overlap: 0, thickness: 8, glass: 'temperado_incolor', height: 2000,
    benefits: ['Projeto feito sob medida', 'Medição técnica no local', 'Instalação profissional'] },
];
export const projectType = (id: string) => PROJECT_TYPES.find(p => p.id === id) || PROJECT_TYPES[PROJECT_TYPES.length - 1];

export const COLORS: { id: string; label: string; swatch: string }[] = [
  { id: 'preto', label: 'Preto', swatch: '#1b1b1f' },
  { id: 'branco', label: 'Branco', swatch: '#ffffff' },
  { id: 'natural', label: 'Natural', swatch: '#c4c8ce' },
  { id: 'bronze', label: 'Bronze', swatch: '#6d4c33' },
  { id: 'dourado', label: 'Dourado', swatch: '#c9a24b' },
  { id: 'inox', label: 'Inox', swatch: '#9aa1a9' },
];
export const colorLabel = (id: string) => COLORS.find(c => c.id === id)?.label || id;

/** Aparência do vidro na simulação. */
export const SIM_GLASS: { id: string; label: string }[] = [
  { id: 'incolor', label: 'Incolor' },
  { id: 'fume', label: 'Fumê' },
  { id: 'verde', label: 'Verde' },
  { id: 'jateado', label: 'Jateado' },
  { id: 'reflecta', label: 'Refletivo' },
];

/** Vidros do orçamento. */
export const QUOTE_GLASS: { id: string; label: string }[] = [
  { id: 'temperado_incolor', label: 'Temperado incolor' },
  { id: 'temperado_fume', label: 'Temperado fumê' },
  { id: 'temperado_verde', label: 'Temperado verde' },
  { id: 'temperado_jateado', label: 'Temperado jateado' },
  { id: 'laminado_incolor', label: 'Laminado incolor' },
  { id: 'laminado_fume', label: 'Laminado fumê' },
  { id: 'comum_incolor', label: 'Comum incolor' },
  { id: 'espelho_prata', label: 'Espelho prata' },
];
export const glassLabel = (id: string) => QUOTE_GLASS.find(g => g.id === id)?.label || id;
export const THICKNESSES = [3, 4, 5, 6, 8, 10, 12, 16, 20];

export interface Pane { label: string; kind: PaneKind; width: number; height: number; area: number }

/** Divide o vão nas peças de vidro. Medidas em mm; área em m². */
export function calcPanes(type: ProjectType, width: number, height: number, panels: number): Pane[] {
  const n = Math.max(1, Math.round(panels) || 1);
  const w = Math.round((Math.max(width, 0) + (n - 1) * type.overlap) / n);
  return Array.from({ length: n }, (_, i) => ({
    label: `V${i + 1}`,
    // Em correr, as folhas das pontas são fixas e as centrais correm; com 2 folhas: uma fixa e uma móvel.
    kind: !type.sliding ? 'fixo' : type.id === 'envidracamento' ? 'movel' : n <= 2 ? (i === 0 ? 'fixo' : 'movel') : i === 0 || i === n - 1 ? 'fixo' : 'movel',
    width: w,
    height: Math.round(height),
    area: (w * height) / 1_000_000,
  }));
}

// ---- Desenho técnico (mesmas formas na tela e no PDF) ----------------------
export type Shape =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill: string; stroke: string }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; dash?: boolean }
  | { t: 'text'; x: number; y: number; text: string; size: number; color: string; anchor?: 'start' | 'middle' | 'end' };

export function elevation(panes: Pane[], width: number, height: number) {
  const W = 340, H = 210, left = 48, top = 26;
  const maxW = W - left - 12, maxH = H - top - 24;
  const scale = Math.min(maxW / Math.max(width, 1), maxH / Math.max(height, 1));
  const dw = Math.max(width * scale, 30), dh = Math.max(height * scale, 30);
  const x0 = left + (maxW - dw) / 2, y0 = top;
  const pw = dw / Math.max(panes.length, 1);
  const shapes: Shape[] = [];
  panes.forEach((p, i) => {
    const x = x0 + i * pw;
    shapes.push({ t: 'rect', x, y: y0, w: pw, h: dh, fill: p.kind === 'movel' ? '#dceafb' : '#eef5fd', stroke: '#2c5bcc' });
    shapes.push({ t: 'text', x: x + pw / 2, y: y0 + dh / 2 - 2, text: p.label, size: 10, color: '#17336f', anchor: 'middle' });
    if (pw > 34) shapes.push({ t: 'text', x: x + pw / 2, y: y0 + dh / 2 + 10, text: p.kind === 'movel' ? 'móvel' : 'fixo', size: 7.5, color: '#5b6885', anchor: 'middle' });
  });
  // cota da largura
  shapes.push({ t: 'line', x1: x0, y1: y0 - 10, x2: x0 + dw, y2: y0 - 10, stroke: '#5b6885' });
  shapes.push({ t: 'line', x1: x0, y1: y0 - 14, x2: x0, y2: y0 - 6, stroke: '#5b6885' });
  shapes.push({ t: 'line', x1: x0 + dw, y1: y0 - 14, x2: x0 + dw, y2: y0 - 6, stroke: '#5b6885' });
  shapes.push({ t: 'text', x: x0 + dw / 2, y: y0 - 14, text: `${Math.round(width)} mm`, size: 9, color: '#0f1a33', anchor: 'middle' });
  // cota da altura
  shapes.push({ t: 'line', x1: x0 - 10, y1: y0, x2: x0 - 10, y2: y0 + dh, stroke: '#5b6885' });
  shapes.push({ t: 'line', x1: x0 - 14, y1: y0, x2: x0 - 6, y2: y0, stroke: '#5b6885' });
  shapes.push({ t: 'line', x1: x0 - 14, y1: y0 + dh, x2: x0 - 6, y2: y0 + dh, stroke: '#5b6885' });
  shapes.push({ t: 'text', x: x0 - 16, y: y0 + dh / 2 + 3, text: `${Math.round(height)}`, size: 9, color: '#0f1a33', anchor: 'end' });
  return { W, H, shapes };
}
