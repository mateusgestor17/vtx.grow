import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { BusinessProfile, Payment, Quote, QuoteItem, STATUS, addDays, calcItem, calcTotals, defaultPayment, newItem } from '../lib/quotes';
import { COLORS, PROJECT_TYPES, QUOTE_GLASS, THICKNESSES, elevation, projectType } from '../lib/projects';
import { compressPhoto, signedUrls, uploadImage } from '../lib/images';
import { date } from '../lib/format';
import { Shell } from '../components/Shell';
import { Icon, Loading } from '../components/ui';
import { FloatingCTA } from '../components/Report';
import { useAppNav } from './Client';
import type { Simulation } from './Simulator';

const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Campo numérico em reais ou milímetros, sem o problema de vírgula do teclado do celular. */
function Num({ label, value, onChange, suffix, decimals }: { label: string; value: number; onChange: (n: number) => void; suffix?: string; decimals?: boolean }) {
  const [text, setText] = useState(value ? String(value).replace('.', ',') : '');
  useEffect(() => { if (Number(text.replace(',', '.')) !== value) setText(value ? String(value).replace('.', ',') : ''); }, [value]);
  return (
    <div className="field">
      <label>{label}</label>
      <div className="input-wrap">
        <input className="input" inputMode={decimals ? 'decimal' : 'numeric'} value={text} placeholder="0"
          onChange={e => {
            const v = e.target.value.replace(decimals ? /[^\d,]/g : /\D/g, '');
            setText(v);
            onChange(Number(v.replace(',', '.')) || 0);
          }} />
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
    </div>
  );
}

export function Elevation({ item }: { item: QuoteItem }) {
  const c = calcItem(item);
  const { W, H, shapes } = elevation(c.panes, item.width, item.height);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Desenho do vão e das peças de vidro" style={{ maxWidth: 380 }}>
      {shapes.map((s, i) => {
        if (s.t === 'rect') return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.fill} stroke={s.stroke} />;
        if (s.t === 'line') return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.stroke} strokeWidth={0.8} />;
        return <text key={i} x={s.x} y={s.y} fontSize={s.size} fill={s.color} textAnchor={s.anchor}>{s.text}</text>;
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
export function QuotesList() {
  const groups = useAppNav();
  const nav = useNavigate();
  const [rows, setRows] = useState<Quote[] | null>(null);
  useEffect(() => {
    supabase.from('quotes').select('*').order('created_at', { ascending: false }).then(({ data }) => setRows((data as Quote[]) || []));
  }, []);
  if (!rows) return <Loading />;
  const approved = rows.filter(r => r.status === 'aprovado');
  const sum = (l: Quote[]) => l.reduce((s, r) => s + Number(r.total), 0);
  return (
    <Shell groups={groups} title="Orçamentos" crumb="Propostas para os seus clientes"
      actions={<Link to="/app/orcamentos/novo" className="btn btn-primary btn-sm">Novo orçamento</Link>}>
      <div className="grid g3">
        <div className="card tight kpi"><small>Orçamentos</small><b>{rows.length}</b><span>{money(sum(rows))} em propostas</span></div>
        <div className="card tight kpi"><small>Aprovados</small><b style={{ color: 'var(--green)' }}>{approved.length}</b><span>{money(sum(approved))}</span></div>
        <div className="card tight kpi"><small>Taxa de aprovação</small><b>{rows.length ? Math.round((approved.length / rows.length) * 100) : 0}%</b><span>dos orçamentos criados</span></div>
      </div>
      {rows.length === 0 ? (
        <div className="card sim-empty mt16"><Icon name="file" size={30} /><h3 className="mt8">Nenhum orçamento ainda</h3><p className="hint">Crie o primeiro e gere um PDF profissional para o seu cliente.</p>
          <Link to="/app/orcamentos/novo" className="btn btn-primary mt16">Criar orçamento</Link></div>
      ) : (
        <div className="table-wrap rtable mt16">
          <table>
            <thead><tr><th>Nº</th><th>Cliente</th><th>Projeto</th><th className="num">Total</th><th>Status</th><th>Data</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} className="clickable" onClick={() => nav(`/app/orcamentos/${r.id}`)}>
                <td><b>Nº {r.number}</b></td><td data-label="Cliente">{r.client_name}</td>
                <td data-label="Projeto" className="muted">{r.title || r.items.map(i => projectType(i.type).label).join(', ') || '—'}</td>
                <td className="num" data-label="Total"><b>{money(Number(r.total))}</b></td>
                <td data-label="Status"><span className={`tag ${STATUS[r.status].tag}`}>{STATUS[r.status].label}</span></td>
                <td data-label="Data">{date(r.created_at)}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
      <FloatingCTA />
    </Shell>
  );
}

// ---------------------------------------------------------------------------
interface Draft {
  client_name: string; client_phone: string; client_email: string; client_address: string; title: string;
  items: QuoteItem[]; payment: Payment; discount: number; notes: string; valid_until: string; simulation_ids: string[]; status: string;
}

function ItemEditor({ item, n, onChange, onRemove, canRemove }: { item: QuoteItem; n: number; onChange: (i: QuoteItem) => void; onRemove: () => void; canRemove: boolean }) {
  const c = calcItem(item);
  const set = (patch: Partial<QuoteItem>) => {
    const next = { ...item, ...patch };
    // Mudar o vão recalcula as folhas sugeridas
    if (patch.width !== undefined && patch.panels === undefined) next.panels = projectType(item.type).panels(patch.width);
    onChange(next);
  };
  function changeType(type: string) {
    const t = projectType(type);
    onChange({ ...item, type, panels: t.panels(item.width), glass: t.glass, thickness: t.thickness, height: t.height || item.height });
  }
  return (
    <div className="card">
      <div className="card-head">
        <h3>Item {n}</h3>
        <div className="row"><b>{money(c.total)}</b>{canRemove && <button className="link-danger" onClick={onRemove}>Remover</button>}</div>
      </div>
      <div className="form-grid">
        <div className="field"><label>Projeto</label><select className="select" value={item.type} onChange={e => changeType(e.target.value)}>{PROJECT_TYPES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
        <div className="field"><label>Ambiente</label><input className="input" value={item.environment} placeholder="Ex.: Banheiro da suíte" onChange={e => set({ environment: e.target.value })} /></div>
        <Num label="Largura do vão" suffix="mm" value={item.width} onChange={width => set({ width })} />
        <Num label="Altura" suffix="mm" value={item.height} onChange={height => set({ height })} />
        <Num label="Folhas / peças" value={item.panels} onChange={panels => set({ panels })} />
        <Num label="Quantidade" suffix="un" value={item.qty} onChange={qty => set({ qty })} />
        <div className="field"><label>Vidro</label><select className="select" value={item.glass} onChange={e => set({ glass: e.target.value })}>{QUOTE_GLASS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select></div>
        <div className="field"><label>Espessura</label><select className="select" value={item.thickness} onChange={e => set({ thickness: Number(e.target.value) })}>{THICKNESSES.map(t => <option key={t} value={t}>{t} mm</option>)}</select></div>
        <div className="field"><label>Cor do alumínio/ferragens</label><select className="select" value={item.color} onChange={e => set({ color: e.target.value })}>{COLORS.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></div>
        <Num label="Vidro: preço por m²" suffix="R$" decimals value={item.pricePerM2} onChange={pricePerM2 => set({ pricePerM2 })} />
        <Num label="Ferragens/perfis (por unidade)" suffix="R$" decimals value={item.hardware} onChange={hardware => set({ hardware })} />
        <Num label="Instalação (por unidade)" suffix="R$" decimals value={item.labor} onChange={labor => set({ labor })} />
      </div>
      <div className="field mt16"><label>Observação do item</label><input className="input" value={item.notes} placeholder="Ex.: puxador longo de 60 cm" onChange={e => set({ notes: e.target.value })} /></div>
      <div className="glass-box mt16">
        <div><Elevation item={item} /></div>
        <div>
          <div className="legend"><b>Quadro de vidros</b> (por unidade)</div>
          <table className="mt8"><thead><tr><th>Peça</th><th>Tipo</th><th className="num">Medida (mm)</th><th className="num">Área</th></tr></thead>
            <tbody>{c.panes.map(p => <tr key={p.label}><td>{p.label}</td><td>{p.kind === 'movel' ? 'Móvel' : 'Fixo'}</td><td className="num">{p.width} × {p.height}</td><td className="num">{p.area.toFixed(2).replace('.', ',')} m²</td></tr>)}</tbody></table>
          <p className="legend mt8">Total: {c.paneTotal} {c.paneTotal === 1 ? 'vidro' : 'vidros'} · {c.areaTotal.toFixed(2).replace('.', ',')} m². Confirme as medidas de corte na medição técnica.</p>
        </div>
      </div>
    </div>
  );
}

export function QuoteEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { session } = useAuth();
  const nav = useNavigate();
  const groups = useAppNav();
  const [q, setQ] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<Quote | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [sims, setSims] = useState<Simulation[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: b }, { data: s }] = await Promise.all([
        supabase.from('business_profiles').select('*').eq('user_id', session!.user.id).maybeSingle(),
        supabase.from('simulations').select('*').eq('status', 'done').order('created_at', { ascending: false }).limit(30),
      ]);
      const list = (s || []) as Simulation[];
      setBusiness(b as BusinessProfile | null);
      setSims(list);
      signedUrls(list.map(x => x.after_path || '')).then(setUrls);
      if (id) {
        const { data } = await supabase.from('quotes').select('*').eq('id', id).maybeSingle();
        if (!data) { nav('/app/orcamentos', { replace: true }); return; }
        const r = data as Quote;
        setSaved(r);
        setQ({ client_name: r.client_name, client_phone: r.client_phone || '', client_email: r.client_email || '', client_address: r.client_address || '', title: r.title || '', items: r.items, payment: r.payment, discount: Number(r.discount), notes: r.notes || '', valid_until: r.valid_until || '', simulation_ids: r.simulation_ids || [], status: r.status });
      } else {
        const fromSim = list.find(x => x.id === params.get('sim'));
        const item = newItem(fromSim?.project_type);
        if (fromSim?.options?.color) item.color = fromSim.options.color;
        setQ({ client_name: '', client_phone: '', client_email: '', client_address: '', title: '', items: [item], payment: defaultPayment(b as BusinessProfile | null), discount: 0, notes: '', valid_until: addDays((b as BusinessProfile | null)?.validity_days ?? 7), simulation_ids: fromSim ? [fromSim.id] : [], status: 'rascunho' });
      }
    })();
  }, [id]);

  const totals = useMemo(() => (q ? calcTotals(q.items, q.discount, q.payment) : null), [q]);
  if (!q || !totals) return <Loading />;
  const set = (patch: Partial<Draft>) => { setOk(''); setQ({ ...q, ...patch }); };
  const setPay = (patch: Partial<Payment>) => set({ payment: { ...q.payment, ...patch } });

  async function save(): Promise<Quote | null> {
    if (!q!.client_name.trim()) { setErr('Informe o nome do cliente.'); window.scrollTo({ top: 0, behavior: 'smooth' }); return null; }
    setErr(''); setBusy('save');
    const payload = { ...q!, user_id: session!.user.id, valid_until: q!.valid_until || null, total: totals!.total };
    const res = saved
      ? await supabase.from('quotes').update(payload).eq('id', saved.id).select('*').single()
      : await supabase.from('quotes').insert(payload).select('*').single();
    setBusy('');
    if (res.error) { setErr('Não foi possível salvar. ' + res.error.message); return null; }
    const row = res.data as Quote;
    setSaved(row); setOk('Orçamento salvo.');
    if (!saved) nav(`/app/orcamentos/${row.id}`, { replace: true });
    return row;
  }

  async function pdf() {
    const row = await save();
    if (!row) return;
    setBusy('pdf');
    try {
      const { downloadQuotePdf } = await import('../lib/quotePdf');
      await downloadQuotePdf(row, business, sims.filter(s => q!.simulation_ids.includes(s.id)));
      setOk('PDF gerado.');
    } catch (e) {
      console.error(e);
      setErr('Não foi possível gerar o PDF. Tente novamente.');
    }
    setBusy('');
  }

  async function sendWhatsapp() {
    // A janela precisa abrir no clique: depois de um await o Safari bloqueia.
    const win = window.open('about:blank', '_blank');
    const row = await save();
    if (!row) { win?.close(); return; }
    const digits = q!.client_phone.replace(/\D/g, '');
    const phone = digits.startsWith('55') ? digits : `55${digits}`;
    const text = `Olá, ${q!.client_name.split(' ')[0]}! Aqui é da ${business?.company_name || 'nossa empresa'}. Preparei a proposta do seu projeto no valor de ${money(totals!.total)}${totals!.pixSavings > 0 ? ` (ou ${money(totals!.pixTotal)} à vista no PIX)` : ''}. Vou te enviar o PDF com o antes e depois e todos os detalhes.`;
    const url = `https://wa.me/${digits ? phone : ''}?text=${encodeURIComponent(text)}`;
    if (win) win.location.href = url; else window.location.href = url;
    if (row.status === 'rascunho') {
      await supabase.from('quotes').update({ status: 'enviado' }).eq('id', row.id);
      set({ status: 'enviado' });
    }
  }

  async function remove() {
    if (!saved || !window.confirm('Excluir este orçamento? Esta ação não pode ser desfeita.')) return;
    await supabase.from('quotes').delete().eq('id', saved.id);
    nav('/app/orcamentos');
  }

  const toggleSim = (sid: string) => set({ simulation_ids: q.simulation_ids.includes(sid) ? q.simulation_ids.filter(x => x !== sid) : [...q.simulation_ids, sid].slice(-3) });

  return (
    <Shell groups={groups} title={saved ? `Orçamento nº ${saved.number}` : 'Novo orçamento'} crumb="Orçamentos"
      actions={<Link to="/app/orcamentos" className="btn btn-ghost btn-sm">Voltar</Link>}>
      {!business?.company_name && <div className="notice warn">Preencha os <Link to="/app/empresa">dados da sua empresa</Link> para que logo, garantia e prazo apareçam no PDF.</div>}
      {err && <div className="error mt8">{err}</div>}
      <div className="grid quote-grid mt16">
        <div className="grid" style={{ gap: 16, alignContent: 'start' }}>
          <div className="card">
            <h3>Cliente</h3>
            <div className="form-grid mt8">
              <div className="field"><label>Nome *</label><input className="input" value={q.client_name} onChange={e => set({ client_name: e.target.value })} /></div>
              <div className="field"><label>WhatsApp</label><input className="input" inputMode="tel" value={q.client_phone} placeholder="(00) 00000-0000" onChange={e => set({ client_phone: e.target.value })} /></div>
              <div className="field"><label>E-mail</label><input className="input" type="email" value={q.client_email} onChange={e => set({ client_email: e.target.value })} /></div>
              <div className="field"><label>Endereço da obra</label><input className="input" value={q.client_address} onChange={e => set({ client_address: e.target.value })} /></div>
              <div className="field"><label>Título da proposta</label><input className="input" value={q.title} placeholder="Ex.: Box do banheiro da suíte" onChange={e => set({ title: e.target.value })} /></div>
              <div className="field"><label>Válida até</label><input className="input" type="date" value={q.valid_until} onChange={e => set({ valid_until: e.target.value })} /></div>
            </div>
          </div>

          {q.items.map((it, i) => (
            <ItemEditor key={it.id} item={it} n={i + 1} canRemove={q.items.length > 1}
              onChange={next => set({ items: q.items.map(x => (x.id === it.id ? next : x)) })}
              onRemove={() => set({ items: q.items.filter(x => x.id !== it.id) })} />
          ))}
          <button className="btn btn-ghost" onClick={() => set({ items: [...q.items, newItem()] })}><Icon name="plus" /> Adicionar item</button>

          <div className="card">
            <h3>Imagens do antes e depois</h3>
            <p className="hint">Escolha até 3. A primeira vira a capa do PDF.</p>
            {sims.length === 0 ? <p className="muted mt8">Nenhuma simulação ainda. <Link to="/app/simulador">Criar no Simulador de IA</Link></p> : (
              <div className="gallery mt16">{sims.map(s => {
                const on = q.simulation_ids.includes(s.id);
                return (
                  <div className={`gallery-item ${on ? 'picked' : ''}`} key={s.id}>
                    <button onClick={() => toggleSim(s.id)} aria-pressed={on}>{s.after_path && urls[s.after_path] && <img src={urls[s.after_path]} alt={projectType(s.project_type).label} loading="lazy" />}</button>
                    <div className="gallery-meta"><b>{projectType(s.project_type).label}</b><span>{on ? 'Selecionada' : 'Toque para incluir'}</span></div>
                  </div>
                );
              })}</div>
            )}
          </div>

          <div className="card">
            <h3>Pagamento</h3>
            <div className="form-grid mt8">
              <Num label="Desconto no PIX" suffix="%" decimals value={q.payment.pixDiscountPct} onChange={pixDiscountPct => setPay({ pixDiscountPct })} />
              <Num label="Parcelas" suffix="x" value={q.payment.installments} onChange={installments => setPay({ installments })} />
              <Num label="Juros ao mês (0 = sem juros)" suffix="%" decimals value={q.payment.interestPct} onChange={interestPct => setPay({ interestPct })} />
              <Num label="Entrada" suffix="%" decimals value={q.payment.downPct} onChange={downPct => setPay({ downPct })} />
              <Num label="Desconto especial" suffix="R$" decimals value={q.discount} onChange={discount => set({ discount })} />
            </div>
            <div className="field mt16"><label>Observações para o cliente</label><textarea className="textarea" value={q.notes} onChange={e => set({ notes: e.target.value })} /></div>
          </div>
        </div>

        <aside className="quote-summary">
          <div className="card">
            <h3>Resumo</h3>
            <div className="sum-row"><span>Vidros</span><b>{totals.panes} · {totals.area.toFixed(2).replace('.', ',')} m²</b></div>
            <div className="sum-row"><span>Subtotal</span><b>{money(totals.subtotal)}</b></div>
            {totals.discount > 0 && <div className="sum-row"><span>Desconto</span><b style={{ color: 'var(--green)' }}>- {money(totals.discount)}</b></div>}
            <div className="sum-total"><span>Total</span><b>{money(totals.total)}</b></div>
            {totals.pixSavings > 0 && <div className="sum-row"><span>À vista no PIX</span><b style={{ color: 'var(--green)' }}>{money(totals.pixTotal)}</b></div>}
            <div className="sum-row"><span>{totals.downValue > 0 ? `Entrada ${money(totals.downValue)} +` : 'Parcelado'}</span><b>{totals.installments}x de {money(totals.installmentValue)}</b></div>
            {totals.hasInterest && <div className="sum-row"><span>Total parcelado</span><b>{money(totals.installmentTotal)}</b></div>}
            <div className="field mt16"><label>Status</label><select className="select" value={q.status} onChange={e => set({ status: e.target.value })}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            {ok && <div className="notice ok mt8">{ok}</div>}
            <button className="btn btn-primary btn-block mt16" disabled={!!busy} onClick={pdf}>{busy === 'pdf' ? 'Gerando PDF…' : 'Salvar e gerar PDF'}</button>
            <button className="btn btn-ghost btn-block mt8" disabled={!!busy} onClick={save}>{busy === 'save' ? 'Salvando…' : 'Salvar'}</button>
            <button className="btn btn-green btn-block mt8" disabled={!!busy} onClick={sendWhatsapp}><Icon name="whatsapp" /> Avisar cliente no WhatsApp</button>
            {saved && <button className="link-danger mt16" onClick={remove}>Excluir orçamento</button>}
          </div>
        </aside>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
export function BusinessSettings() {
  const { session } = useAuth();
  const groups = useAppNav();
  const uid = session!.user.id;
  const [b, setB] = useState<Partial<BusinessProfile> | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    supabase.from('business_profiles').select('*').eq('user_id', uid).maybeSingle().then(async ({ data }) => {
      setB(data || { warranty: '12 meses de garantia na instalação e nas ferragens', lead_time: '15 dias úteis após a medição técnica', validity_days: 7, pix_discount_pct: 5, max_installments: 10, differentials: 'Medição técnica no local\nInstalação com equipe própria\nAcabamento e limpeza ao final da obra' });
      if (data?.logo_path) setLogoUrl((await signedUrls([data.logo_path]))[data.logo_path]);
    });
  }, [uid]);
  if (!b) return <Loading />;
  const set = (patch: Partial<BusinessProfile>) => { setMsg(''); setB({ ...b, ...patch }); };

  async function onLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const blob = await compressPhoto(file, 800);
      const path = await uploadImage(uid, 'logo', blob);
      set({ logo_path: path });
      setLogoUrl(URL.createObjectURL(blob));
    } catch (ex: any) { setErr(ex.message); }
  }
  async function save(e: FormEvent) {
    e.preventDefault(); setErr('');
    const { error } = await supabase.from('business_profiles').upsert({ ...b, user_id: uid });
    if (error) setErr('Não foi possível salvar. ' + error.message); else setMsg('Dados salvos.');
  }
  const text = (k: keyof BusinessProfile, label: string, placeholder = '') => (
    <div className="field"><label>{label}</label><input className="input" value={(b[k] as string) || ''} placeholder={placeholder} onChange={e => set({ [k]: e.target.value } as any)} /></div>
  );
  return (
    <Shell groups={groups} title="Minha empresa" crumb="Esses dados aparecem nos seus orçamentos">
      <form onSubmit={save} className="grid" style={{ gap: 16, maxWidth: 820 }}>
        {err && <div className="error">{err}</div>}
        <div className="card">
          <h3>Identidade</h3>
          <div className="row mt16">
            <label className="logo-pick">{logoUrl ? <img src={logoUrl} alt="Logo" /> : <span>Enviar logo</span>}<input type="file" accept="image/*" hidden onChange={onLogo} /></label>
            <p className="hint" style={{ flex: 1, minWidth: 180 }}>Sua logo vai na capa da proposta. Prefira fundo branco.</p>
          </div>
          <div className="form-grid mt16">
            {text('company_name', 'Nome da empresa')}
            {text('phone', 'WhatsApp', '(00) 00000-0000')}
            {text('email', 'E-mail')}
            {text('instagram', 'Instagram', '@suaempresa')}
            {text('cnpj', 'CNPJ')}
            {text('address', 'Endereço')}
          </div>
        </div>
        <div className="card">
          <h3>Padrões da proposta</h3>
          <div className="form-grid mt8">
            {text('warranty', 'Garantia')}
            {text('lead_time', 'Prazo de entrega')}
            <Num label="Validade da proposta" suffix="dias" value={Number(b.validity_days)} onChange={validity_days => set({ validity_days })} />
            <Num label="Desconto no PIX" suffix="%" decimals value={Number(b.pix_discount_pct)} onChange={pix_discount_pct => set({ pix_discount_pct })} />
            <Num label="Parcelas máximas" suffix="x" value={Number(b.max_installments)} onChange={max_installments => set({ max_installments })} />
          </div>
          <div className="field mt16"><label>Diferenciais (um por linha)</label><textarea className="textarea" value={b.differentials || ''} onChange={e => set({ differentials: e.target.value })} /></div>
        </div>
        {msg && <div className="notice ok">{msg}</div>}
        <button className="btn btn-primary">Salvar dados</button>
      </form>
    </Shell>
  );
}
