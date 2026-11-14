"use client";
// Reduz e comprime a imagem no navegador antes do envio (limite de corpo da Vercel: 4,5 MB).

const MAX_SIDE = 1568;
const QUALITY = 0.85;

export interface PreparedImage {
  dataUrl: string;
  mimeType: "image/jpeg";
  thumbnail: string;
  width: number;
  height: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir a imagem."));
    };
    img.src = url;
  });
}

function draw(img: HTMLImageElement, maxSide: number, quality: number): { dataUrl: string; w: number; h: number } {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("O navegador não permitiu processar a imagem.");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { dataUrl: canvas.toDataURL("image/jpeg", quality), w, h };
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  const img = await loadImage(file);
  const main = draw(img, MAX_SIDE, QUALITY);
  const thumb = draw(img, 240, 0.6);
  return { dataUrl: main.dataUrl, mimeType: "image/jpeg", thumbnail: thumb.dataUrl, width: main.w, height: main.h };
}
