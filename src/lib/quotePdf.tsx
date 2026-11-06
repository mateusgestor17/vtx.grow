// PDF comercial do orçamento. Carregado sob demanda para não pesar o restante do app.
import { Document, Image, Line, Page, Rect, StyleSheet, Svg, Text, View, pdf } from '@react-pdf/renderer';
import { BusinessProfile, Quote, QuoteItem, calcItem, calcTotals } from './quotes';
import { colorLabel, elevation, glassLabel, projectType } from './projects';
import { imageForPdf } from './images';
import type { Simulation } from '../pages/Simulator';

const INK = '#0f1a33', MUTED = '#5b6885', LINE = '#e1e6ef', BLUE = '#2c5bcc', SOFT = '#f3f6fc', GREEN = '#1fa463';

const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateBr = (s?: string | null) => (s ? new Date(`${s.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '');
const m2 = (n: number) => `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: INK, paddingTop: 42, paddingBottom: 56, paddingHorizontal: 40, lineHeight: 1.4 },
  footer: { position: 'absolute', bottom: 22, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: MUTED, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 7 },
  eyebrow: { fontSize: 8.5, color: BLUE, fontFamily: 'Helvetica-Bold', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  h1: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  h2: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  muted: { color: MUTED },
  card: { borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 12, marginBottom: 12 },
  th: { backgroundColor: SOFT, flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 7, fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: MUTED },
  tr: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 7, borderBottomWidth: 1, borderBottomColor: LINE },
  b: { fontFamily: 'Helvetica-Bold' },
  bullet: { flexDirection: 'row', marginBottom: 3 },
  mark: { color: GREEN, fontFamily: 'Helvetica-Bold', width: 12 },
});

function Footer({ b, q }: { b: BusinessProfile | null; q: Quote }) {
  return (
    <View style={s.footer} fixed>
      <Text>{[b?.company_name, b?.phone, b?.instagram].filter(Boolean).join('  ·  ')}</Text>
      <Text render={({ pageNumber, totalPages }) => `Proposta nº ${q.number}  ·  ${pageNumber}/${totalPages}`} />
    </View>
  );
}

function Header({ title, eyebrow }: { title: string; eyebrow: string }) {
  return <View style={{ marginBottom: 14 }}><Text style={s.eyebrow}>{eyebrow}</Text><Text style={s.h1}>{title}</Text></View>;
}

function Diagram({ item }: { item: QuoteItem }) {
  const c = calcItem(item);
  const { W, H, shapes } = elevation(c.panes, item.width, item.height);
  return (
    <Svg width={W * 0.72} height={H * 0.72} viewBox={`0 0 ${W} ${H}`}>
      {shapes.map((sh, i) => {
        if (sh.t === 'rect') return <Rect key={i} x={sh.x} y={sh.y} width={sh.w} height={sh.h} fill={sh.fill} stroke={sh.stroke} strokeWidth={1} />;
        if (sh.t === 'line') return <Line key={i} x1={sh.x1} y1={sh.y1} x2={sh.x2} y2={sh.y2} stroke={sh.stroke} strokeWidth={0.7} />;
        return <Text key={i} x={sh.x} y={sh.y} textAnchor={sh.anchor} style={{ fontSize: sh.size, fontFamily: 'Helvetica' }} fill={sh.color}>{sh.text}</Text>;
      })}
    </Svg>
  );
}

function ItemBlock({ item, n }: { item: QuoteItem; n: number }) {
  const c = calcItem(item);
  const t = projectType(item.type);
  const qty = Math.max(1, item.qty || 1);
  return (
    <View style={s.card} wrap={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>{n}. {t.label}{item.environment ? ` — ${item.environment}` : ''}</Text>
          <Text style={s.muted}>{glassLabel(item.glass)} {item.thickness} mm · Alumínio e ferragens: {colorLabel(item.color)}{qty > 1 ? ` · ${qty} unidades iguais` : ''}</Text>
        </View>
        <Text style={[s.b, { fontSize: 12 }]}>{money(c.total)}</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 250 }}><Diagram item={item} /></View>
        <View style={{ flex: 1 }}>
          <View style={s.th}><Text style={{ width: 36 }}>Peça</Text><Text style={{ width: 42 }}>Tipo</Text><Text style={{ flex: 1 }}>Medida (mm)</Text><Text style={{ width: 28, textAlign: 'right' }}>Qtd</Text><Text style={{ width: 52, textAlign: 'right' }}>Área</Text></View>
          {c.panes.map(p => (
            <View style={s.tr} key={p.label}><Text style={{ width: 36 }}>{p.label}</Text><Text style={{ width: 42 }}>{p.kind === 'movel' ? 'Móvel' : 'Fixo'}</Text><Text style={{ flex: 1 }}>{p.width} × {p.height}</Text><Text style={{ width: 28, textAlign: 'right' }}>{qty}</Text><Text style={{ width: 52, textAlign: 'right' }}>{m2(p.area * qty)}</Text></View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 7 }}><Text style={s.b}>{c.paneTotal} {c.paneTotal === 1 ? 'vidro' : 'vidros'}</Text><Text style={s.b}>{m2(c.areaTotal)}</Text></View>
          {!!item.notes && <Text style={[s.muted, { paddingHorizontal: 7 }]}>{item.notes}</Text>}
        </View>
      </View>
      <View style={{ marginTop: 6 }}>{t.benefits.map(x => <View style={s.bullet} key={x}><Text style={s.mark}>•</Text><Text style={{ flex: 1 }}>{x}</Text></View>)}</View>
    </View>
  );
}

function Payment({ q }: { q: Quote }) {
  const t = calcTotals(q.items, q.discount, q.payment);
  const options = [
    t.pixSavings > 0 ? { title: 'À vista no PIX', value: money(t.pixTotal), sub: `Você economiza ${money(t.pixSavings)}`, color: GREEN } : { title: 'À vista', value: money(t.total), sub: 'Pagamento único', color: GREEN },
    {
      title: t.downValue > 0 ? `Entrada + ${t.installments}x` : `Parcelado em ${t.installments}x`,
      value: `${t.installments}x de ${money(t.installmentValue)}`,
      sub: [t.downValue > 0 ? `Entrada de ${money(t.downValue)}` : '', t.hasInterest ? `Com juros · total ${money(t.installmentTotal)}` : 'Sem juros'].filter(Boolean).join(' · '),
      color: BLUE,
    },
  ];
  return (
    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
      {options.map((o, i) => (
        <View key={o.title} style={{ flex: 1, borderWidth: 1.5, borderColor: o.color, borderRadius: 8, padding: 12, marginRight: i === 0 ? 10 : 0 }}>
          <Text style={[s.b, { color: o.color, fontSize: 9 }]}>{o.title.toUpperCase()}</Text>
          <Text style={[s.b, { fontSize: 16, marginVertical: 3 }]}>{o.value}</Text>
          <Text style={s.muted}>{o.sub}</Text>
        </View>
      ))}
    </View>
  );
}

function QuoteDoc({ q, b, sims, logo }: { q: Quote; b: BusinessProfile | null; sims: { sim: Simulation; before: string | null; after: string | null }[]; logo: string | null }) {
  const t = calcTotals(q.items, q.discount, q.payment);
  const hero = sims.find(x => x.after)?.after;
  const company = b?.company_name || 'Sua vidraçaria';
  const differentials = (b?.differentials || '').split('\n').map(x => x.trim()).filter(Boolean);
  const title = q.title || q.items.map(i => projectType(i.type).label).filter((v, i, a) => a.indexOf(v) === i).join(' + ') || 'Projeto em vidro';
  return (
    <Document title={`Proposta ${q.number} - ${q.client_name}`} author={company}>
      {/* Capa */}
      <Page size="A4" style={[s.page, { padding: 0 }]}>
        {hero ? <Image src={hero} style={{ width: '100%', height: 470, objectFit: 'cover' }} /> : <View style={{ height: 180, backgroundColor: BLUE }} />}
        <View style={{ paddingHorizontal: 40, paddingTop: 26 }}>
          {logo ? <Image src={logo} style={{ height: 44, width: 120, objectFit: 'contain', objectPosition: 'left', marginBottom: 12 }} /> : <Text style={[s.b, { fontSize: 14, marginBottom: 10 }]}>{company}</Text>}
          <Text style={s.eyebrow}>Proposta comercial nº {q.number}</Text>
          <Text style={[s.h1, { fontSize: 26 }]}>{title}</Text>
          <Text style={{ fontSize: 12, marginBottom: 12 }}>Preparada especialmente para {q.client_name}</Text>
          <Text style={s.muted}>Emitida em {dateBr(q.created_at)}{q.valid_until ? `  ·  Válida até ${dateBr(q.valid_until)}` : ''}</Text>
          {!!q.client_address && <Text style={s.muted}>Local do projeto: {q.client_address}</Text>}
        </View>
        <Footer b={b} q={q} />
      </Page>

      {/* Antes e depois */}
      {sims.length > 0 && (
        <Page size="A4" style={s.page}>
          <Header eyebrow="Visualize antes de investir" title="Como o seu ambiente vai ficar" />
          {sims.map(({ sim, before, after }) => (
            <View key={sim.id} style={{ marginBottom: 14 }} wrap={false}>
              <Text style={[s.b, { marginBottom: 5 }]}>{projectType(sim.project_type).label}</Text>
              <View style={{ flexDirection: 'row' }}>
                {[{ l: 'ANTES', src: before, c: MUTED }, { l: 'DEPOIS', src: after, c: GREEN }].map((x, i) => (
                  <View key={x.l} style={{ flex: 1, marginRight: i === 0 ? 8 : 0 }}>
                    {x.src && <Image src={x.src} style={{ width: '100%', height: 190, objectFit: 'cover', borderRadius: 6 }} />}
                    <Text style={[s.b, { color: x.c, fontSize: 9, marginTop: 4 }]}>{x.l}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
          <Text style={[s.muted, { fontSize: 8 }]}>Imagens ilustrativas geradas por inteligência artificial para ajudar na visualização do projeto. O resultado final pode variar.</Text>
          <Footer b={b} q={q} />
        </Page>
      )}

      {/* Detalhamento */}
      <Page size="A4" style={s.page}>
        <Header eyebrow="Projeto detalhado" title="O que vamos instalar" />
        <Text style={[s.muted, { marginBottom: 10 }]}>{t.panes} {t.panes === 1 ? 'vidro' : 'vidros'} · {m2(t.area)} no total</Text>
        {q.items.map((it, i) => <ItemBlock key={it.id} item={it} n={i + 1} />)}
        <Text style={[s.muted, { fontSize: 8 }]}>Medidas estimadas. As medidas finais de corte são confirmadas na medição técnica no local.</Text>
        <Footer b={b} q={q} />
      </Page>

      {/* Investimento */}
      <Page size="A4" style={s.page}>
        <Header eyebrow="Seu investimento" title="Valores e condições" />
        <View style={{ marginBottom: 12 }}>
          <View style={s.th}><Text style={{ flex: 1 }}>Item</Text><Text style={{ width: 90, textAlign: 'right' }}>Valor</Text></View>
          {q.items.map(it => (
            <View style={s.tr} key={it.id}><Text style={{ flex: 1 }}>{projectType(it.type).label}{it.environment ? ` — ${it.environment}` : ''}{(it.qty || 1) > 1 ? ` (${it.qty}x)` : ''}</Text><Text style={{ width: 90, textAlign: 'right' }}>{money(calcItem(it).total)}</Text></View>
          ))}
          {t.discount > 0 && <View style={s.tr}><Text style={{ flex: 1, color: GREEN }}>Desconto especial</Text><Text style={{ width: 90, textAlign: 'right', color: GREEN }}>- {money(t.discount)}</Text></View>}
          <View style={{ flexDirection: 'row', padding: 8 }}><Text style={[s.b, { flex: 1, fontSize: 12 }]}>Total do projeto</Text><Text style={[s.b, { fontSize: 12 }]}>{money(t.total)}</Text></View>
        </View>
        <Payment q={q} />
        {!!q.valid_until && <View style={{ backgroundColor: '#fef6e2', borderRadius: 6, padding: 9, marginBottom: 12 }}><Text style={[s.b, { color: '#8a5a00' }]}>Condição garantida até {dateBr(q.valid_until)}. Depois dessa data, valores e prazos podem mudar.</Text></View>}

        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <View style={{ flex: 1, marginRight: 14 }}>
            <Text style={s.h2}>Por que a {company}</Text>
            {differentials.map(x => <View style={s.bullet} key={x}><Text style={s.mark}>•</Text><Text style={{ flex: 1 }}>{x}</Text></View>)}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.h2}>Sua tranquilidade</Text>
            {!!b?.warranty && <View style={s.bullet}><Text style={s.mark}>•</Text><Text style={{ flex: 1 }}>{b.warranty}</Text></View>}
            {!!b?.lead_time && <View style={s.bullet}><Text style={s.mark}>•</Text><Text style={{ flex: 1 }}>Prazo de entrega: {b.lead_time}</Text></View>}
          </View>
        </View>
        {!!q.notes && <View style={{ marginBottom: 12 }}><Text style={s.h2}>Observações</Text><Text>{q.notes}</Text></View>}

        <View wrap={false}>
          <Text style={s.h2}>Próximos passos</Text>
          {['Aprove esta proposta por WhatsApp ou assinando abaixo.', 'Agendamos a medição técnica no local.', 'Fabricamos e instalamos o seu projeto no prazo combinado.'].map((x, i) => (
            <View style={s.bullet} key={x}><Text style={[s.b, { color: BLUE, width: 14 }]}>{i + 1}.</Text><Text style={{ flex: 1 }}>{x}</Text></View>
          ))}
          <View style={{ flexDirection: 'row', marginTop: 30 }}>
            <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: INK, paddingTop: 4, marginRight: 20 }}><Text>{q.client_name}</Text><Text style={[s.muted, { fontSize: 8 }]}>Aceite do cliente</Text></View>
            <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: INK, paddingTop: 4 }}><Text>{company}</Text><Text style={[s.muted, { fontSize: 8 }]}>{[b?.cnpj ? `CNPJ ${b.cnpj}` : '', b?.address].filter(Boolean).join(' · ') || 'Responsável'}</Text></View>
          </View>
        </View>
        <Footer b={b} q={q} />
      </Page>
    </Document>
  );
}

export async function downloadQuotePdf(q: Quote, b: BusinessProfile | null, simulations: Simulation[]) {
  const [logo, sims] = await Promise.all([
    b?.logo_path ? imageForPdf(b.logo_path, 500) : Promise.resolve(null),
    Promise.all(simulations.slice(0, 3).map(async sim => ({
      sim, before: await imageForPdf(sim.before_path), after: sim.after_path ? await imageForPdf(sim.after_path) : null,
    }))),
  ]);
  const blob = await pdf(<QuoteDoc q={q} b={b} sims={sims} logo={logo} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Proposta-${q.number}-${q.client_name.replace(/[^\p{L}\p{N}]+/gu, '-')}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
