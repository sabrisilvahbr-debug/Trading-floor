// Índice de declarações financeiras da Câmara dos EUA (House Clerk), como em trader-pelosi.
// Lê o ZIP anual <ANO>FD.zip, pega o XML e lista os PTRs (Periodic Transaction Reports).
// Os PDFs de cada PTR não são lidos aqui: o app mostra o link para o documento oficial.
import { inflateRawSync } from "node:zlib";

export interface Ptr {
  docId: string;
  name: string;
  state: string;
  filed: string; // YYYY-MM-DD
  year: number;
  pdf: string;
}

/** Extrai um arquivo de um ZIP (método 0 ou 8) pelo diretório central. */
export function unzipFirst(buf: Buffer, predicate: (name: string) => boolean): Buffer | null {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP sem diretório central.");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("ZIP corrompido.");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    if (predicate(name)) {
      const lNameLen = buf.readUInt16LE(local + 26);
      const lExtraLen = buf.readUInt16LE(local + 28);
      const start = local + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(start, start + csize);
      if (method === 0) return Buffer.from(data);
      if (method === 8) return inflateRawSync(data);
      throw new Error(`Método de compressão ${method} não suportado.`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

function tag(block: string, name: string) {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(block);
  return m ? m[1].trim() : "";
}

/** XML do índice -> PTRs, mais recentes primeiro. */
export function parseIndex(xml: string, year: number): Ptr[] {
  const out: Ptr[] = [];
  for (const m of xml.matchAll(/<Member>([\s\S]*?)<\/Member>/g)) {
    const b = m[1];
    if (tag(b, "FilingType") !== "P") continue;
    const docId = tag(b, "DocID");
    const [mm, dd, yy] = tag(b, "FilingDate").split("/");
    const filed = yy && mm && dd ? `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}` : "";
    const name = [tag(b, "Prefix"), tag(b, "First"), tag(b, "Last"), tag(b, "Suffix")].filter(Boolean).join(" ");
    out.push({ docId, name, state: tag(b, "StateDst"), filed, year, pdf: `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${year}/${docId}.pdf` });
  }
  return out.sort((a, b) => (a.filed < b.filed ? 1 : a.filed > b.filed ? -1 : 0));
}
