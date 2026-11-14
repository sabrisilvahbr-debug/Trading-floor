import { NextResponse } from "next/server";
import { DEFAULT_VISION_MODEL, RULES } from "@/lib/vision";

export const dynamic = "force-dynamic";

/** Diz o que está configurado, sem revelar nenhum valor secreto. */
export async function GET() {
  return NextResponse.json(
    {
      analysis_ready: Boolean(process.env.ANTHROPIC_API_KEY && process.env.APP_ACCESS_CODE),
      anthropic_key: Boolean(process.env.ANTHROPIC_API_KEY),
      access_code: Boolean(process.env.APP_ACCESS_CODE),
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      model: process.env.VISION_MODEL?.trim() || DEFAULT_VISION_MODEL,
      rules: RULES,
      mode: "simulação",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
