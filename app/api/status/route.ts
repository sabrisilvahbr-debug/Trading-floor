import { NextResponse } from "next/server";
import { RULES, pickProvider } from "@/lib/vision";

export const dynamic = "force-dynamic";

/** Diz o que está configurado, sem revelar nenhum valor secreto. */
export async function GET() {
  const provider = pickProvider(process.env);
  return NextResponse.json(
    {
      analysis_ready: Boolean(provider && process.env.APP_ACCESS_CODE),
      provider: provider?.name ?? null,
      vision_key: Boolean(provider),
      access_code: Boolean(process.env.APP_ACCESS_CODE),
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      model: provider?.model ?? null,
      rules: RULES,
      mode: "simulação",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
