"use client";
import audioIndex from "@/data/audio.json";

/**
 * Natural voice audio: every word and collocation is pre-recorded (Kokoro TTS, voice af_heart)
 * into one mp3 sprite per topic. The index maps lower-cased text → [topic, start, duration].
 */
const AIDX = audioIndex as unknown as Record<string, [number, number, number]>;

type AC = typeof AudioContext;
let ctx: AudioContext | null = null;
let current: AudioBufferSourceNode | null = null;
const buffers = new Map<number, Promise<AudioBuffer>>();
const raw = new Map<number, Promise<ArrayBuffer>>();

function getCtx() {
  if (!ctx) {
    const C: AC = window.AudioContext || (window as unknown as { webkitAudioContext: AC }).webkitAudioContext;
    ctx = new C();
  }
  return ctx;
}

const fetchRaw = (L: number) => {
  if (!raw.has(L)) {
    const p = fetch(`/audio/l${L}.mp3`).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.arrayBuffer();
    });
    p.catch(() => raw.delete(L));
    raw.set(L, p);
  }
  return raw.get(L)!;
};

function sprite(L: number) {
  if (!buffers.has(L)) {
    const p = fetchRaw(L).then(
      (b) => new Promise<AudioBuffer>((ok, no) => getCtx().decodeAudioData(b.slice(0), ok, no)),
    );
    p.catch(() => buffers.delete(L));
    buffers.set(L, p);
  }
  return buffers.get(L)!;
}

/** Download a topic's audio ahead of time (no AudioContext needed yet). */
export function preloadAudio(L: number) {
  fetchRaw(L).catch(() => {});
}

let unlocked = false;
/**
 * Browsers (Safari especially) only let a page make sound after a tap or key press, and iOS
 * silences Web Audio when the ring/silent switch is off unless the audio session is "playback".
 */
export function installAudioUnlock() {
  if (typeof window === "undefined") return;
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession) nav.audioSession.type = "playback";
  } catch {}
  const unlock = () => {
    if (unlocked) return;
    try {
      const c = getCtx();
      c.resume();
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
      unlocked = true;
      ["pointerdown", "touchend", "keydown"].forEach((ev) => window.removeEventListener(ev, unlock, true));
    } catch {}
  };
  ["pointerdown", "touchend", "keydown"].forEach((ev) => window.addEventListener(ev, unlock, true));
}

function browserVoice(text: string) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.9;
  const vs = speechSynthesis.getVoices();
  const v = vs.find((v) => /en[-_]US/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

// HTML <audio> fallback for browsers where Web Audio decoding fails.
const els = new Map<number, HTMLAudioElement>();
let elTimer: ReturnType<typeof setTimeout> | undefined;
async function playWithElement(L: number, start: number, dur: number) {
  let a = els.get(L);
  if (!a) {
    a = new Audio(`/audio/l${L}.mp3`);
    a.preload = "auto";
    els.set(L, a);
  }
  els.forEach((x) => x !== a && x.pause());
  clearTimeout(elTimer);
  a.currentTime = Math.max(0, start - 0.02);
  await a.play();
  elTimer = setTimeout(() => a!.pause(), (dur + 0.12) * 1000);
}

export async function speak(text: string) {
  if (typeof window === "undefined") return;
  const e = AIDX[text.toLowerCase().trim()];
  if (!e) return browserVoice(text);
  const [L, start, dur] = e;
  try {
    const c = getCtx();
    if (c.state !== "running") await c.resume();
    const buf = await sprite(L);
    try {
      current?.stop();
    } catch {}
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0, Math.max(0, start - 0.02), dur + 0.1);
    current = src;
    return;
  } catch {}
  try {
    await playWithElement(L, start, dur);
    return;
  } catch {}
  browserVoice(text);
}
