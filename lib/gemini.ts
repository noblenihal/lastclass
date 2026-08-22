/**
 * Server-only Gemini access.
 *
 * Two primitives, so every route handler stays thin:
 *   generateJSON  — schema-constrained structured output
 *   generateSpeech — TTS, returned as a playable WAV
 *
 * The API key is read from the environment here and never leaves the server.
 */

import "server-only";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const TEXT_MODEL = "gemini-3.7-flash";
export const TTS_MODEL = "gemini-3.1-flash-tts-preview";

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

async function call(
  model: string,
  body: unknown,
  timeoutMs = 60_000,
): Promise<GeminiPart[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/${model}:generateContent?key=${apiKey()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Gemini ${model} ${res.status}: ${detail.slice(0, 300)}`);
    }
    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) {
      throw new Error(`Gemini ${model} returned no content`);
    }
    return parts as GeminiPart[];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Structured output. The schema is enforced by the API rather than asked for
 * in the prompt, so the response is guaranteed-parseable rather than hopefully-JSON.
 */
export async function generateJSON<T>(opts: {
  prompt: string;
  schema: Record<string, unknown>;
  system?: string;
  images?: { mimeType: string; data: string }[];
  temperature?: number;
}): Promise<T> {
  const parts: GeminiPart[] = [];
  for (const img of opts.images ?? []) parts.push({ inlineData: img });
  parts.push({ text: opts.prompt });

  const out = await call(TEXT_MODEL, {
    contents: [{ role: "user", parts }],
    ...(opts.system
      ? { systemInstruction: { parts: [{ text: opts.system }] } }
      : {}),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: opts.schema,
      temperature: opts.temperature ?? 0.8,
    },
  });

  const text = out.find((p) => typeof p.text === "string")?.text;
  if (!text) throw new Error("Gemini returned no JSON payload");
  return JSON.parse(text) as T;
}

/**
 * Gemini TTS hands back raw 24kHz mono PCM, which no browser will play.
 * We prepend a 44-byte RIFF/WAVE header here so the client gets a file it
 * can drop straight into an <audio> element.
 */
function pcmToWav(pcm: Buffer, sampleRate = 24_000, channels = 1): Buffer {
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // format = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

/** Parses `audio/l16; rate=24000` style mime types for the real sample rate. */
function rateFromMime(mime: string | undefined): number {
  const m = mime?.match(/rate=(\d+)/);
  return m ? Number(m[1]) : 24_000;
}

export async function generateSpeech(opts: {
  text: string;
  voice: string;
  /** Prepended as a delivery instruction — how the line should be performed. */
  direction?: string;
}): Promise<Buffer> {
  const prompt = opts.direction
    ? `${opts.direction}\n\n${opts.text}`
    : opts.text;

  const parts = await call(
    TTS_MODEL,
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voice } },
        },
      },
    },
    90_000,
  );

  const audio = parts.find((p) => p.inlineData)?.inlineData;
  if (!audio) throw new Error("Gemini TTS returned no audio");

  return pcmToWav(
    Buffer.from(audio.data, "base64"),
    rateFromMime(audio.mimeType),
  );
}
