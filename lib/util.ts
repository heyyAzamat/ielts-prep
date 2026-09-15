import type { Example, Word } from "./data";
import { WORDS } from "./data";

export function shuffle<T>(a: readonly T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
export const pick = <T,>(a: readonly T[]): T => a[(Math.random() * a.length) | 0];
export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
export const dayKey = (t: number) => new Date(t).toLocaleDateString("sv");

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Where the target word sits inside an example sentence: [start, end]. */
export function findForm(w: Word, e: Example): [number, number] | null {
  const s = e.en;
  const lo = s.toLowerCase();
  if (e.f) {
    const i = s.includes(e.f) ? s.indexOf(e.f) : lo.indexOf(e.f.toLowerCase());
    if (i >= 0) return [i, i + e.f.length];
  }
  const base = w.w.toLowerCase().split(" ")[0];
  const stem = base.length > 4 ? base.replace(/(e|y)$/, "") : base;
  const m = new RegExp("\\b" + stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[a-z]*", "i").exec(s);
  return m ? [m.index, m.index + m[0].length] : null;
}

export type Split = { before: string; form: string; after: string };
export function splitSentence(w: Word, e: Example): Split | null {
  const r = findForm(w, e);
  if (!r) return null;
  return { before: e.en.slice(0, r[0]), form: e.en.slice(r[0], r[1]), after: e.en.slice(r[1]) };
}

/** Wrong answers: prefer words from the same topic, then the same part of speech. */
export function distractors(w: Word, n: number, field: "w" | "tr"): string[] {
  const same = shuffle(WORDS.filter((x) => x.id !== w.id && x.lesson === w.lesson));
  const samePos = shuffle(WORDS.filter((x) => x.id !== w.id && x.pos === w.pos && x.lesson !== w.lesson));
  const out: string[] = [];
  for (const x of [...same.slice(0, 2), ...samePos, ...same.slice(2)]) {
    if (out.length >= n) break;
    if (!out.includes(x[field]) && x[field] !== w[field]) out.push(x[field]);
  }
  return out;
}

export const lsGet = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
export const lsSet = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
