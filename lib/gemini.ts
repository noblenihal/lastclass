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
import { pcmToWav, rateFromMime } from "./wav";
import { GeminiError, describeBlock } from "./errors";

export { GeminiError, errorResponse } from "./errors";
export type { GeminiFailure } from "./errors";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const TEXT_MODEL = "gemini-3.7-flash";
export const TTS_MODEL = "gemini-3.1-flash-tts-preview";

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new GeminiError(
      "config",
      "This deployment isn't configured with an API key yet.",
    );
  }
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
  let res: Response;
  try {
    res = await fetch(`${BASE}/${model}:generateContent?key=${apiKey()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    if (ctrl.signal.aborted) {
      throw new GeminiError(
        "timeout",
        "That took too long to generate. Try again.",
      );
    }
    throw new GeminiError(
      "unavailable",
      "Couldn't reach Gemini just now. Try again in a moment.",
      String(err),
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new GeminiError(
        "rate_limited",
        /quota/i.test(detail)
          ? "The API quota for this deployment is exhausted. Try again later."
          : "Too many requests just now — wait a few seconds and retry.",
        detail.slice(0, 300),
      );
    }
    if (res.status === 400 && /API key/i.test(detail)) {
      throw new GeminiError("config", "This deployment's API key was rejected.");
    }
    if (res.status >= 500) {
      throw new GeminiError(
        "unavailable",
        "Gemini is having trouble right now. Try again in a moment.",
        detail.slice(0, 300),
      );
    }
    throw new GeminiError(
      "unknown",
      "Gemini rejected that request.",
      `${res.status}: ${detail.slice(0, 300)}`,
    );
  }

  const json = await res.json();

  // Blocked before generation even started.
  const feedback = json?.promptFeedback;
  if (feedback?.blockReason) {
    throw new GeminiError(
      "blocked",
      describeBlock(feedback.blockReason, feedback.safetyRatings),
      `promptFeedback: ${feedback.blockReason}`,
    );
  }

  const candidate = json?.candidates?.[0];
  const finish = candidate?.finishReason;

  if (finish === "SAFETY" || finish === "PROHIBITED_CONTENT") {
    throw new GeminiError(
      "blocked",
      describeBlock(finish, candidate?.safetyRatings),
      `finishReason: ${finish}`,
    );
  }
  if (finish === "RECITATION") {
    throw new GeminiError(
      "recitation",
      "Gemini stopped because the answer was reproducing source material too " +
        "closely. Try narrowing the topic.",
    );
  }
  if (finish === "MAX_TOKENS") {
    throw new GeminiError(
      "unknown",
      "The response was cut off before it finished. Try a narrower topic.",
    );
  }

  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new GeminiError(
      "blocked",
      "Gemini returned nothing for this one — it may have declined the " +
        "subject. Try rephrasing it, or pick a different topic.",
      `finishReason: ${finish ?? "none"}`,
    );
  }
  return parts as GeminiPart[];
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
