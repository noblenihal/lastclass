import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateSpeech } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  text: z.string().trim().min(1).max(1200),
  voice: z.string().trim().min(1).max(40),
  direction: z.string().trim().max(300).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const wav = await generateSpeech(parsed.data);
    return new NextResponse(new Uint8Array(wav), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[tts]", err);
    return NextResponse.json({ error: "Speech unavailable" }, { status: 502 });
  }
}
