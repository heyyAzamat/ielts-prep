import wordsJson from "@/data/words.json";
import lessonsJson from "@/data/lessons.json";

export type Example = { en: string; ru: string; f?: string };
export type Collocation = { c: string; ru: string };
export type Word = {
  id: string;
  w: string;
  lesson: number;
  pos: string;
  ipa: string;
  tr: string;
  expl: string;
  def: string;
  ex: Example[];
  col: string[];
  cols: Collocation[];
  syn: string[];
};
export type Lesson = { n: number; unit: number; unitName: string; name: string };

export const WORDS = wordsJson as unknown as Word[];
export const LESSONS = lessonsJson as Lesson[];
export const BYID = new Map(WORDS.map((w) => [w.id, w]));
export const UNITS = Array.from({ length: 10 }, (_, i) => i + 1);
export const lessonOf = (w: Word) => LESSONS[w.lesson - 1];

export const DAY = 864e5;
export const INTERVAL = [0, 1, 3, 7, 16, 35];
export const STAGES = ["New", "Seen", "Recognized", "Recalled", "Using", "Learned"];
export const STAGE_COL = [
  "rgba(255,255,255,.09)",
  "#3C5A5E",
  "#4C9AA0",
  "#8FB9B0",
  "#C9D9C6",
  "#8FC39A",
];

/** Scope of words for quizzes and flashcards, encoded in the URL as `due`, `all`, `seen`, `u3` or `l7`. */
export type Scope = { due?: true; all?: true; seen?: true; unit?: number; lesson?: number };

export function parseScope(v: string | null | undefined, fallback: Scope = { lesson: 1 }): Scope {
  if (!v) return fallback;
  if (v === "due") return { due: true };
  if (v === "all") return { all: true };
  if (v === "seen") return { seen: true };
  const n = Number(v.slice(1));
  if (v[0] === "u" && n >= 1 && n <= 10) return { unit: n };
  if (v[0] === "l" && n >= 1 && n <= LESSONS.length) return { lesson: n };
  return fallback;
}

export function scopeKey(s: Scope): string {
  return s.lesson ? `l${s.lesson}` : s.unit ? `u${s.unit}` : s.all ? "all" : s.seen ? "seen" : "due";
}
