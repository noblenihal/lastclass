"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal shape of the Web Speech API — it isn't in lib.dom for all targets. */
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { isFinal: boolean; 0: { transcript: string } };
  };
}
interface RecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Live dictation. Speech recognition is Chrome-only and needs HTTPS, so every
 * surface that uses this also exposes a typed fallback — a dead mic must never
 * be able to block the lesson.
 */
export function useDictation() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const ref = useRef<RecognitionLike | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    setSupported(recognitionCtor() !== null);
    return () => {
      try {
        ref.current?.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return setError("This browser can't listen. Type instead.");

    setError("");
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += chunk + " ";
        else interim += chunk;
      }
      setTranscript((finalRef.current + interim).trimStart());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") setError("Mic blocked. Type instead.");
      else if (e.error !== "aborted" && e.error !== "no-speech")
        setError("Couldn't hear that. Type instead.");
      setListening(false);
    };
    rec.onend = () => setListening(false);

    ref.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Couldn't start the mic. Type instead.");
    }
  }, []);

  const stop = useCallback(() => {
    try {
      ref.current?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    finalRef.current = "";
    setTranscript("");
    setError("");
  }, []);

  const setManual = useCallback((text: string) => {
    finalRef.current = text;
    setTranscript(text);
  }, []);

  return { supported, listening, transcript, error, start, stop, reset, setManual };
}

/**
 * Speaks a line through Gemini TTS. Returns a promise that settles when the
 * audio finishes, so callers can sequence lines. Failures resolve rather than
 * throw — losing a voice line should never break the lesson flow.
 */
export function useSpeaker() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      if (a.src.startsWith("blob:")) URL.revokeObjectURL(a.src);
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, voice: string, direction?: string) => {
      stop();
      setSpeaking(true);
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice, direction }),
        });
        if (!res.ok) throw new Error("tts failed");

        const url = URL.createObjectURL(await res.blob());
        const audio = new Audio(url);
        audioRef.current = audio;

        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });

        URL.revokeObjectURL(url);
      } catch {
        /* voice is an enhancement — the text is already on screen */
      } finally {
        setSpeaking(false);
      }
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return { speak, stop, speaking };
}
