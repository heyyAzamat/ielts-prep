"use client";
import { useMemo, useState } from "react";
import { EntryDialog } from "@/components/EntryDialog";
import { WordRow } from "@/components/WordRow";
import { STAGES, WORDS } from "@/lib/data";
import { useProgress } from "@/lib/progress";

export default function WordsPage() {
  const { get } = useProgress();
  const [q, setQ] = useState("");
  const [f, setF] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    const now = Date.now();
    return WORDS.filter((w) => {
      const p = get(w.id);
      const hit = !s || w.w.includes(s) || w.tr.toLowerCase().includes(s);
      const stage = f === "all" || (f === "due" ? p.b > 0 && p.d <= now : String(Math.min(5, p.b)) === f);
      return hit && stage;
    });
  }, [q, f, get]);

  return (
    <>
      <div className="page-h">
        <h1>All words</h1>
        <span className="muted tn">{WORDS.length}</span>
      </div>
      <div className="tools">
        <input id="q" className="field" type="search" placeholder="Search a word or translation" value={q} onChange={(e) => setQ(e.target.value)} />
        <select id="f" className="field" value={f} onChange={(e) => setF(e.target.value)} aria-label="Stage">
          <option value="all">All stages</option>
          {STAGES.map((s, i) => (
            <option key={s} value={String(i)}>
              {s}
            </option>
          ))}
          <option value="due">Due for review</option>
        </select>
      </div>
      <div className="list">
        {rows.slice(0, 300).map((w) => (
          <WordRow key={w.id} w={w} p={get(w.id)} showUnit onOpen={setOpen} />
        ))}
        {rows.length > 300 && <div className="empty">Showing the first 300 — refine your search</div>}
        {!rows.length && <div className="empty">Nothing found</div>}
      </div>
      <EntryDialog id={open} onClose={() => setOpen(null)} />
    </>
  );
}
