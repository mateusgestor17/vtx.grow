import { supabase } from './supabase';

export const BUCKET = 'project-images';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível abrir esta imagem.'));
    img.src = src;
  });
}

function toCanvas(img: HTMLImageElement, max: number) {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Reduz a foto antes do envio: mais rápido, mais barato e sem dados de localização (EXIF). */
export async function compressPhoto(file: File, max = 1600): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const canvas = toCanvas(await loadImage(url), max);
    return await new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Falha ao processar a foto.'))), 'image/jpeg', 0.88));
  } catch {
    throw new Error('Formato não suportado. Envie uma foto em JPG ou PNG.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadImage(userId: string, folder: string, blob: Blob) {
  const path = `${userId}/${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw new Error('Não foi possível enviar a imagem. Tente novamente.');
  return path;
}

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(unique, 3600);
  const out: Record<string, string> = {};
  (data || []).forEach(d => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl; });
  return out;
}

/** Imagem em JPEG (data URL) para o PDF. */
export async function imageForPdf(path: string, max = 1400): Promise<string | null> {
  try {
    const { data } = await supabase.storage.from(BUCKET).download(path);
    if (!data) return null;
    const url = URL.createObjectURL(data);
    try { return toCanvas(await loadImage(url), max).toDataURL('image/jpeg', 0.85); }
    finally { URL.revokeObjectURL(url); }
  } catch { return null; }
}
