"use client";
import { useEffect, useRef } from "react";
import { BYID, STAGES } from "@/lib/data";
import { useProgress } from "@/lib/progress";
import { toast } from "@/lib/toast";
import { Highlight } from "./Highlight";
import { Say } from "./Say";

export function EntryDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { get, reset } = useProgress();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (id && !d.open) d.showModal();
    if (!id && d.open) d.close();
  }, [id]);

  const w = id ? BYID.get(id) : null;
  const p = id ? get(id) : null;
  const now = Date.now();
  const when = !p
    ? ""
    : p.b === 0
      ? "not studied yet"
      : p.d <= now
        ? "due now"
        : "review on " + new Date(p.d).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      {w && p && (
        <div className="glass">
          <div className="hw">
            {w.w} <Say text={w.w} />
          </div>
          <div className="meta">
            <span className="pos">{w.pos}</span>
            <span>/{w.ipa}/</span>
          </div>
          <div className="tr">{w.tr}</div>
          <div className="expl">{w.expl}</div>
          <div className="def">{w.def}</div>
          <ul className="ex">
            {w.ex.map((e, i) => (
              <li key={i}>
                <div className="en">
                  <Highlight w={w} e={e} />
                </div>
                <div className="ru">{e.ru}</div>
              </li>
            ))}
          </ul>
          <div className="chips">
            {w.col.map((c) => (
              <span className="chip" key={c}>
                {c}
              </span>
            ))}
            {w.syn.map((c) => (
              <span className="chip syn" key={c}>
                ≈ {c}
              </span>
            ))}
          </div>
          <div className="meta" style={{ marginTop: 18, fontSize: 13 }}>
            <span className="label" style={{ color: "var(--moss)" }}>
              {STAGES[Math.min(5, p.b)]}
            </span>
            <span>
              {when} · correct <span className="tn">{p.r}</span> · mistakes <span className="tn">{p.x}</span>
            </span>
          </div>
          <div className="dactions">
            <button
              className="btn sm"
              onClick={() => {
                reset(w.id);
                onClose();
                toast("The word is back to new");
              }}
            >
              Reset word
            </button>
            <button className="btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
