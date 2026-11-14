import { createHash, timingSafeEqual } from "node:crypto";

/** Compara o código enviado com APP_ACCESS_CODE sem vazar tempo de comparação. */
export function accessGranted(sent: string | null, expected: string | undefined): boolean {
  if (!expected || !sent) return false;
  const a = createHash("sha256").update(sent).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
