import { describe, expect, it } from "vitest";
import { pcmToWav, rateFromMime } from "../wav";

/**
 * One wrong byte in this header means silent audio — a failure that never
 * throws and never surfaces until someone hits play in front of an audience.
 */
describe("pcmToWav", () => {
  const pcm = Buffer.alloc(1000, 7);
  const wav = pcmToWav(pcm, 24_000, 1);

  it("prepends exactly 44 bytes", () => {
    expect(wav.length).toBe(pcm.length + 44);
  });

  it("writes the RIFF/WAVE container markers", () => {
    expect(wav.subarray(0, 4).toString()).toBe("RIFF");
    expect(wav.subarray(8, 12).toString()).toBe("WAVE");
    expect(wav.subarray(12, 16).toString()).toBe("fmt ");
    expect(wav.subarray(36, 40).toString()).toBe("data");
  });

  it("declares PCM format with the given channel count and rate", () => {
    expect(wav.readUInt16LE(20)).toBe(1); // 1 = PCM
    expect(wav.readUInt16LE(22)).toBe(1); // channels
    expect(wav.readUInt32LE(24)).toBe(24_000); // sample rate
    expect(wav.readUInt16LE(34)).toBe(16); // bits per sample
  });

  it("computes byte rate and block align from the format", () => {
    // 24000 Hz * 1 channel * 16 bits / 8 = 48000 bytes/sec
    expect(wav.readUInt32LE(28)).toBe(48_000);
    expect(wav.readUInt16LE(32)).toBe(2); // 1 channel * 16 bits / 8
  });

  it("reports the two sizes the format requires", () => {
    expect(wav.readUInt32LE(4)).toBe(36 + pcm.length); // RIFF chunk
    expect(wav.readUInt32LE(40)).toBe(pcm.length); // data chunk
  });

  it("leaves the samples untouched after the header", () => {
    expect(wav.subarray(44).equals(pcm)).toBe(true);
  });

  it("carries a non-default rate through every dependent field", () => {
    const w = pcmToWav(Buffer.alloc(10), 48_000, 2);
    expect(w.readUInt32LE(24)).toBe(48_000);
    expect(w.readUInt32LE(28)).toBe(48_000 * 2 * 2);
    expect(w.readUInt16LE(32)).toBe(4);
  });

  it("handles empty audio without producing a malformed header", () => {
    const w = pcmToWav(Buffer.alloc(0));
    expect(w.length).toBe(44);
    expect(w.readUInt32LE(40)).toBe(0);
  });
});

describe("rateFromMime", () => {
  it("reads the rate Gemini actually reports", () => {
    expect(rateFromMime("audio/L16;codec=pcm;rate=24000")).toBe(24_000);
    expect(rateFromMime("audio/l16; rate=48000; channels=1")).toBe(48_000);
  });

  it("falls back to 24kHz when the mime type says nothing", () => {
    expect(rateFromMime("audio/l16")).toBe(24_000);
    expect(rateFromMime(undefined)).toBe(24_000);
  });
});
