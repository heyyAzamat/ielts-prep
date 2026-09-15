"use client";
import Link from "next/link";
import { useState } from "react";
import { EntryDialog } from "@/components/EntryDialog";
import { WordRow } from "@/components/WordRow";
import { LESSONS, WORDS } from "@/lib/data";
import { useProgress } from "@/lib/progress";

export function Topic({ lesson }: { lesson: number }) {
  const l = LESSONS[lesson - 1];
  const { get } = useProgress();
  const [open, setOpen] = useState<string | null>(null);
  const ws = WORDS.filter((w) => w.lesson === l.n);

  return (
    <>
      <Link className="back" href="/">
        ← All units
      </Link>
      <div className="page-h">
        <div>
          <div className="label">
            Unit {l.unit} · {l.unitName} · topic {((l.n - 1) % 3) + 1} of 3
          </div>
          <h1 style={{ marginTop: 10 }}>{l.name}</h1>
        </div>
        <div className="row" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" href={`/read/${l.n}`}>
            Read the text
          </Link>
          <Link className="btn" href={`/cards?scope=l${l.n}`}>
            Flashcards
          </Link>
          <Link className="pearl sm" href={`/quiz?scope=l${l.n}`}>
            Take the quiz
          </Link>
        </div>
      </div>
      <div className="list">
        {ws.map((w) => (
          <WordRow key={w.id} w={w} p={get(w.id)} onOpen={setOpen} />
        ))}
      </div>
      <EntryDialog id={open} onClose={() => setOpen(null)} />
    </>
  );
}
