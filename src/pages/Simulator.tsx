import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { BUCKET, compressPhoto, signedUrls, uploadImage } from '../lib/images';
import { COLORS, PROJECT_TYPES, SIM_GLASS, colorLabel, projectType } from '../lib/projects';
import { dateTime } from '../lib/format';
import { Shell } from '../components/Shell';
import { Icon, Loading } from '../components/ui';
import { FloatingCTA } from '../components/Report';
import { useAppNav } from './Client';

export interface Simulation {
  id: string; project_type: string; options: { color?: string; glass?: string }; details: string | null;
  before_path: string; after_path: string | null; status: string; error: string | null; created_at: string;
}

export function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="ba">
      <img src={after} alt="Depois: projeto simulado" />
      <img src={before} alt="Antes: foto original" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <div className="ba-line" style={{ left: `${pos}%` }}><span>⇆</span></div>
      <span className="ba-tag" style={{ left: 10 }}>Antes</span>
      <span className="ba-tag" style={{ right: 10 }}>Depois</span>
      <input type="range" min={0} max={100} value={pos} onChange={e => setPos(Number(e.target.value))} aria-label="Comparar antes e depois" />
    </div>
  );
}

export default function Simulator() {
  const { session } = useAuth();
  const nav = useNavigate();
  const groups = useAppNav();
  const uid = session!.user.id;
  const fileRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<Simulation[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<{ path: string; url: string } | null>(null);
  const [type, setType] = useState('box_correr');
  const [color, setColor] = useState('preto');
  const [glass, setGlass] = useState('incolor');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState<'' | 'upload' | 'generate'>('');
  const [err, setErr] = useState('');
  const [current, setCurrent] = useState<Simulation | null>(null);

  async function refresh() {
    const { data } = await supabase.from('simulations').select('*').eq('status', 'done').order('created_at', { ascending: false }).limit(60);
    const list = (data || []) as Simulation[];
    setItems(list);
    const signed = await signedUrls(list.flatMap(s => [s.before_path, s.after_path || '']));
    setUrls(u => ({ ...u, ...signed }));
  }
  useEffect(() => { refresh(); }, []);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErr(''); setBusy('upload'); setCurrent(null);
    try {
      const blob = await compressPhoto(file);
      const path = await uploadImage(uid, 'before', blob);
      setPhoto({ path, url: URL.createObjectURL(blob) });
    } catch (ex: any) { setErr(ex.message); }
    setBusy('');
  }

  async function generate() {
    if (!photo) return;
    setErr(''); setBusy('generate');
    const { data, error } = await supabase.functions.invoke('simulate', {
      body: { before_path: photo.path, project_type: type, options: { color, glass }, details: details.trim() },
    });
    if (error) {
      let message = 'Não foi possível gerar a imagem. Tente novamente.';
      try { const b = await (error as any).context.json(); if (b?.message) message = b.message; } catch { /* mantém a mensagem padrão */ }
      setErr(message); setBusy(''); return;
    }
    const sim = data.simulation as Simulation;
    const signed = await signedUrls([sim.before_path, sim.after_path || '']);
    setUrls(u => ({ ...u, ...signed }));
    setCurrent(sim);
    setItems(l => [sim, ...(l || [])]);
    setBusy('');
  }

  function openSim(s: Simulation) {
    setCurrent(s);
    setPhoto({ path: s.before_path, url: urls[s.before_path] });
    setType(s.project_type);
    if (s.options?.color) setColor(s.options.color);
    if (s.options?.glass) setGlass(s.options.glass);
    setDetails(s.details || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(s: Simulation) {
    if (!window.confirm('Excluir esta simulação?')) return;
    await supabase.from('simulations').delete().eq('id', s.id);
    const paths = s.after_path ? [s.after_path] : [];
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    setItems(l => (l || []).filter(x => x.id !== s.id));
    if (current?.id === s.id) setCurrent(null);
  }

  if (!items) return <Loading />;
  const shown = current && current.after_path && urls[current.after_path] && urls[current.before_path] ? current : null;

  return (
    <Shell groups={groups} title="Simulador de IA" crumb="Mostre o projeto pronto antes de vender">
      <div className="grid sim-grid">
        <div className="card">
          <h3>1. Foto do local</h3>
          <p className="hint">Tire de frente, com boa luz, mostrando todo o vão.</p>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          <button className="drop mt16" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            {photo?.url ? <img src={photo.url} alt="Foto enviada" /> : <span><Icon name="plus" size={26} /><br />{busy === 'upload' ? 'Enviando…' : 'Tirar ou escolher foto'}</span>}
          </button>
          {photo && <button className="mini-toggle mt8" onClick={() => fileRef.current?.click()} disabled={!!busy}>Trocar foto</button>}

          <h3 className="mt24">2. Projeto</h3>
          <div className="pills mt8">{PROJECT_TYPES.map(p => <button key={p.id} className={`pill ${type === p.id ? 'on' : ''}`} onClick={() => setType(p.id)}>{p.label}</button>)}</div>

          <h3 className="mt24">3. Acabamento</h3>
          <div className="legend mt8">Cor do alumínio e das ferragens</div>
          <div className="pills mt8">{COLORS.map(c => <button key={c.id} className={`pill ${color === c.id ? 'on' : ''}`} onClick={() => setColor(c.id)}><i className="swatch" style={{ background: c.swatch }} />{c.label}</button>)}</div>
          <div className="legend mt16">Vidro</div>
          <div className="pills mt8">{SIM_GLASS.map(g => <button key={g.id} className={`pill ${glass === g.id ? 'on' : ''}`} onClick={() => setGlass(g.id)}>{g.label}</button>)}</div>

          <h3 className="mt24">4. Detalhes (opcional)</h3>
          <textarea className="textarea mt8" maxLength={1000} value={details} onChange={e => setDetails(e.target.value)} placeholder="Ex.: porta de correr do lado direito, puxador longo preto, vidro até o teto." />

          {err && <div className="error mt16">{err}</div>}
          <button className="btn btn-primary btn-block mt16" disabled={!photo || !!busy} onClick={generate}>
            {busy === 'generate' ? 'Gerando imagem… pode levar até 1 minuto' : shown ? 'Gerar nova versão' : 'Gerar imagem do projeto'}
          </button>
        </div>

        <div className="sim-result">
          {shown ? (
            <div className="card">
              <div className="card-head">
                <div><h3>{projectType(shown.project_type).label}</h3><p className="hint">{colorLabel(shown.options?.color || '')} · arraste para comparar</p></div>
              </div>
              <BeforeAfter before={urls[shown.before_path]} after={urls[shown.after_path!]} />
              <p className="legend mt8">Imagem ilustrativa gerada por IA. O resultado final pode variar.</p>
              <div className="row mt16">
                <button className="btn btn-primary" onClick={() => nav(`/app/orcamentos/novo?sim=${shown.id}`)}>Usar no orçamento</button>
                <a className="btn btn-ghost" href={urls[shown.after_path!]} target="_blank" rel="noreferrer" download>Abrir imagem</a>
              </div>
            </div>
          ) : (
            <div className="card sim-empty">
              <Icon name="bolt" size={30} />
              <h3 className="mt8">{busy === 'generate' ? 'Criando o seu projeto…' : 'O projeto pronto aparece aqui'}</h3>
              <p className="hint">Envie a foto, escolha o projeto e gere quantas versões precisar para mostrar ao seu cliente.</p>
            </div>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <section className="section">
          <div className="section-title"><div><h2>Projetos gerados</h2><p>{items.length} {items.length === 1 ? 'imagem' : 'imagens'}</p></div></div>
          <div className="gallery">{items.map(s => (
            <div className="gallery-item" key={s.id}>
              <button onClick={() => openSim(s)} aria-label="Abrir simulação">{s.after_path && urls[s.after_path] && <img src={urls[s.after_path]} alt={projectType(s.project_type).label} loading="lazy" />}</button>
              <div className="gallery-meta"><b>{projectType(s.project_type).label}</b><span>{dateTime(s.created_at)}</span>
                <button className="link-danger" onClick={() => remove(s)}>Excluir</button></div>
            </div>
          ))}</div>
        </section>
      )}
      <FloatingCTA />
    </Shell>
  );
}
