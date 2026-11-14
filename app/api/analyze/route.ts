import { NextResponse } from "next/server";
import { accessGranted } from "@/lib/access";
import { VisionError, callClaude, callGemini, decideSignal, parseVisionInput, pickProvider } from "@/lib/vision";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const accessCode = process.env.APP_ACCESS_CODE;
  if (!accessCode) return error(503, "Análise desligada: falta configurar APP_ACCESS_CODE na Vercel.");
  if (!accessGranted(request.headers.get("x-access-code"), accessCode)) {
    return error(401, "Código de acesso inválido. Confira em Ajustes.");
  }
  const provider = pickProvider(process.env);
  if (!provider) return error(503, "Análise desligada: falta configurar GEMINI_API_KEY na Vercel.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "Corpo da requisição inválido.");
  }

  try {
    const input = parseVisionInput(body);
    const started = Date.now();
    const reading =
      provider.name === "gemini"
        ? await callGemini(input, provider.key, provider.model)
        : await callClaude(input, provider.key, provider.model);
    const decision = decideSignal(reading);
    return NextResponse.json(
      { model: provider.model, provider: provider.name, elapsed_ms: Date.now() - started, reading, decision },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof VisionError) return error(e.status, e.message);
    return error(500, "Erro inesperado na análise.");
  }
}
