/**
 * PCM to WAV.
 *
 * Gemini TTS returns raw 24kHz mono PCM, which no browser will play. Kept in
 * its own module with no server-only guard so the header can be tested — one
 * wrong byte here is silent audio, which is exactly the kind of failure that
 * never surfaces until a demo.
 */

/**
 * Gemini TTS hands back raw 24kHz mono PCM, which no browser will play.
 * We prepend a 44-byte RIFF/WAVE header here so the client gets a file it
 * can drop straight into an <audio> element.
 */
export function pcmToWav(pcm: Buffer, sampleRate = 24_000, channels = 1): Buffer {
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
export function rateFromMime(mime: string | undefined): number {
  const m = mime?.match(/rate=(\d+)/);
  return m ? Number(m[1]) : 24_000;
}

