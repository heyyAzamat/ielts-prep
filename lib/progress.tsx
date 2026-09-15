"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DAY, LESSONS, WORDS, type Lesson } from "./data";
import { dayKey, lsGet, lsSet } from "./util";

/** b = stage 0..5, d = next review time, r = right answers, x = mistakes */
export type WordProgress = { b: number; d: number; r: number; x: number };
type Stats = { days: Record<string, number> };
const EMPTY: WordProgress = { b: 0, d: 0, r: 0, x: 0 };

type Ctx = {
  ready: boolean;
  prog: Record<string, WordProgress>;
  stats: Stats;
  get: (id: string) => WordProgress;
  set: (id: string, p: WordProgress) => void;
  bump: () => void;
  reset: (id: string) => void;
};
const ProgressCtx = createContext<Ctx | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [prog, setProg] = useState<Record<string, WordProgress>>({});
  const [stats, setStats] = useState<Stats>({ days: {} });

  useEffect(() => {
    setProg(lsGet("szs-prog", {}));
    setStats(lsGet("szs-stats", { days: {} }));
    setReady(true);
  }, []);

  const get = useCallback((id: string) => prog[id] ?? EMPTY, [prog]);
  const set = useCallback((id: string, p: WordProgress) => {
    setProg((prev) => {
      const next = { ...prev, [id]: p };
      lsSet("szs-prog", next);
      return next;
    });
  }, []);
  const bump = useCallback(() => {
    setStats((prev) => {
      const days = { ...prev.days };
      const k = dayKey(Date.now());
      days[k] = (days[k] || 0) + 1;
      const keys = Object.keys(days).sort();
      while (keys.length > 90) delete days[keys.shift()!];
      const next = { days };
      lsSet("szs-stats", next);
      return next;
    });
  }, []);
  const reset = useCallback((id: string) => set(id, EMPTY), [set]);

  const value = useMemo(() => ({ ready, prog, stats, get, set, bump, reset }), [ready, prog, stats, get, set, bump, reset]);
  return <ProgressCtx.Provider value={value}>{children}</ProgressCtx.Provider>;
}

export function useProgress() {
  const c = useContext(ProgressCtx);
  if (!c) throw new Error("useProgress must be used inside ProgressProvider");
  return c;
}

export function lessonStats(get: Ctx["get"], L: number) {
  const ws = WORDS.filter((w) => w.lesson === L);
  const now = Date.now();
  const byBox = [0, 0, 0, 0, 0, 0];
  let due = 0;
  for (const w of ws) {
    const p = get(w.id);
    byBox[Math.min(5, p.b)]++;
    if (p.b > 0 && p.d <= now) due++;
  }
  return { total: ws.length, byBox, due, fresh: byBox[0] };
}

export function globalStats(get: Ctx["get"]) {
  const now = Date.now();
  const byBox = [0, 0, 0, 0, 0, 0];
  let due = 0;
  for (const w of WORDS) {
    const p = get(w.id);
    byBox[Math.min(5, p.b)]++;
    if (p.b > 0 && p.d <= now) due++;
  }
  return { byBox, due };
}

export function streak(stats: Stats) {
  let n = 0;
  let t = Date.now();
  if (!stats.days[dayKey(t)]) t -= DAY;
  while (stats.days[dayKey(t)]) {
    n++;
    t -= DAY;
  }
  return n;
}

export function nextLesson(get: Ctx["get"]): Lesson {
  return LESSONS.find((l) => lessonStats(get, l.n).fresh > 0) ?? LESSONS[0];
}
