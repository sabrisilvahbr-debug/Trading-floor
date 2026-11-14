import { NextResponse } from "next/server";
import { accessGranted } from "./access";
import { DataError } from "./market/fetch";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Exige o código de acesso e transforma erros conhecidos em respostas claras. */
export async function guarded(request: Request, fn: () => Promise<unknown>) {
  const code = process.env.APP_ACCESS_CODE;
  if (!code) return json({ error: "Desligado: falta configurar APP_ACCESS_CODE na Vercel." }, 503);
  if (!accessGranted(request.headers.get("x-access-code"), code)) return json({ error: "Código de acesso inválido. Confira em Ajustes." }, 401);
  try {
    return json(await fn());
  } catch (e) {
    if (e instanceof DataError) return json({ error: e.message }, e.status);
    if (e instanceof Error) return json({ error: e.message }, 422);
    return json({ error: "Erro inesperado." }, 500);
  }
}
