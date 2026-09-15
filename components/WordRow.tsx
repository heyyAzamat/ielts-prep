"use client";
import { LESSONS, STAGES, type Word } from "@/lib/data";
import type { WordProgress } from "@/lib/progress";

export function WordRow({ w, p, showUnit, onOpen }: { w: Word; p: WordProgress; showUnit?: boolean; onOpen: (id: string) => void }) {
  const l = LESSONS[w.lesson - 1];
  return (
    <button className="item" onClick={() => onOpen(w.id)}>
      <span className="w">
        {w.w}
        <small>{w.pos}</small>
        {showUnit && (
          <div className="u">
            Unit {l.unit} · {l.name}
          </div>
        )}
      </span>
      <span className="t">{w.tr}</span>
      <span className={`pips ${p.b >= 5 ? "m" : ""}`} title={STAGES[Math.min(5, p.b)]}>
        {[1, 2, 3, 4, 5].map((k) => (
          <i key={k} className={p.b >= k ? "on" : ""} />
        ))}
      </span>
    </button>
  );
}
