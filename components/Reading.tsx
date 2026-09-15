"use client";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import readingJson from "@/data/reading.json";
import { BYID, LESSONS, WORDS } from "@/lib/data";
import { speak } from "@/lib/audio";
import { lsGet, lsSet } from "@/lib/util";
import { Say } from "./Say";

type Gloss = { ru: string; en: string };
type Passage = { lesson: number; title: string; paragraphs: string[]; glossary: Record<string, Gloss> };
const PASSAGES = readingJson as unknown as Passage[];

type Token =
  | { kind: "text"; text: string }
  | { kind: "target"; id: string; text: string }
  | { kind: "gloss"; key: string; text: string };

type Pick = { kind: "target"; id: string; text: string } | { kind: "gloss"; key: string; text: string };

/** Splits a paragraph into plain text, marked target words ([[id|text]]) and glossary words. */
function tokenize(par: string, glossRe: RegExp | null): Token[] {
  const out: Token[] = [];
  const pushText = (t: string) => {
    if (!t) return;
    if (!glossRe) return out.push({ kind: "text", text: t });
    let last = 0;
    for (const m of t.matchAll(glossRe)) {
      if (m.index! > last) out.push({ kind: "text", text: t.slice(last, m.index) });
      out.push({ kind: "gloss", key: m[0].toLowerCase(), text: m[0] });
      last = m.index! + m[0].length;
    }
    if (last < t.length) out.push({ kind: "text", text: t.slice(last) });
  };
  const re = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
  let last = 0;
  for (const m of par.matchAll(re)) {
    pushText(par.slice(last, m.index));
    out.push({ kind: "target", id: m[1], text: m[2] });
    last = m.index! + m[0].length;
  }
  pushText(par.slice(last));
  return out;
}

export function Reading({ lesson }: { lesson: number }) {
  const l = LESSONS[lesson - 1];
  const passage = PASSAGES.find((p) => p.lesson === lesson)!;
  const [mode, setMode] = useState<"ru" | "en">("ru");
  useEffect(() => setMode(lsGet<"ru" | "en">("szs-mode", "ru")), []);
  const changeMode = (m: "ru" | "en") => {
    setMode(m);
    lsSet("szs-mode", m);
  };
  const [sel, setSel] = useState<Pick | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; below: boolean } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const pop = useRef<HTMLDivElement>(null);

  const paragraphs = useMemo(() => {
    const keys = Object.keys(passage.glossary).sort((a, b) => b.length - a.length);
    const esc = (k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const glossRe = keys.length ? new RegExp(`\\b(?:${keys.map(esc).join("|")})\\b`, "gi") : null;
    return passage.paragraphs.map((p) => tokenize(p, glossRe));
  }, [passage]);

  const words = WORDS.filter((w) => w.lesson === lesson);

  const open = (p: Pick, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const below = r.top < 260;
    setAnchor({ x: r.left + r.width / 2, y: below ? r.bottom + 10 : r.top - 10, below });
    setSel(p);
    if (p.kind === "target") speak(BYID.get(p.id)!.w);
  };

  useEffect(() => {
    if (!sel) return;
    const close = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      if (e.type === "pointerdown" && (pop.current?.contains(e.target as Node) || (e.target as HTMLElement).closest(".rd-w"))) return;
      setSel(null);
    };
    const onScroll = () => setSel(null);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
      window.removeEventListener("scroll", onScroll);
    };
  }, [sel]);

  // keep the popover inside the screen
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!anchor || !pop.current) return;
    const w = pop.current.offsetWidth;
    setLeft(Math.min(Math.max(12, anchor.x - w / 2), window.innerWidth - w - 12));
  }, [anchor, sel]);

  const target = sel?.kind === "target" ? BYID.get(sel.id)! : null;
  const col = target && sel ? target.cols.find((c) => c.c.toLowerCase() === sel.text.toLowerCase()) : null;
  const gloss = sel?.kind === "gloss" ? passage.glossary[sel.key] : null;

  return (
    <article className="reading">
      <Link className="back" href={`/topic/${lesson}`}>
        ← {l.name}
      </Link>
      <div className="rd-head">
        <div className="label">
          Reading · Unit {l.unit} · {l.unitName}
        </div>
        <h1>{passage.title}</h1>
        <div className="rd-tools">
          <div className="seg" role="group" aria-label="Show meanings as">
            <button aria-pressed={mode === "ru"} onClick={() => changeMode("ru")}>
              RU · translation
            </button>
            <button aria-pressed={mode === "en"} onClick={() => changeMode("en")}>
              EN · explanation
            </button>
          </div>
          <label className="rd-toggle">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            <span>Highlight hard words</span>
          </label>
        </div>
        <p className="muted rd-hint">Tap a highlighted word or phrase to see its meaning. All 20 words of the topic are in the text.</p>
      </div>

      <div className={`rd-text ${showAll ? "all" : ""}`}>
        {paragraphs.map((toks, pi) => (
          <p key={pi}>
            {toks.map((t, ti) =>
              t.kind === "text" ? (
                <Fragment key={ti}>{t.text}</Fragment>
              ) : (
                <button
                  key={ti}
                  type="button"
                  className={`rd-w ${t.kind} ${sel && ((sel.kind === "target" && t.kind === "target" && sel.id === t.id && sel.text === t.text) || (sel.kind === "gloss" && t.kind === "gloss" && sel.key === t.key)) ? "active" : ""}`}
                  onClick={(e) => open(t.kind === "target" ? { kind: "target", id: t.id, text: t.text } : { kind: "gloss", key: t.key, text: t.text }, e.currentTarget)}
                >
                  {t.text}
                </button>
              ),
            )}
          </p>
        ))}
      </div>

      <section className="rd-words">
        <div className="label">Topic words in this text</div>
        <div className="chips">
          {words.map((w) => (
            <button key={w.id} className="chip" onClick={() => speak(w.w)} title={mode === "ru" ? w.tr : w.def}>
              {w.w}
            </button>
          ))}
        </div>
        <div className="card-acts" style={{ justifyContent: "flex-start", marginTop: 22 }}>
          <Link className="btn" href={`/cards?scope=l${lesson}`}>
            Flashcards
          </Link>
          <Link className="pearl sm" href={`/quiz?scope=l${lesson}`}>
            Take the quiz
          </Link>
          {lesson < LESSONS.length && (
            <Link className="btn" href={`/read/${lesson + 1}`}>
              Next text
            </Link>
          )}
        </div>
      </section>

      {sel && anchor && (
        <div
          ref={pop}
          className={`rd-pop ${anchor.below ? "below" : "above"}`}
          style={{ left, top: anchor.y }}
          role="dialog"
          aria-label="Meaning"
        >
          {target ? (
            <>
              <div className="rd-pop-h">
                <span className="rd-pop-w">{col ? col.c : target.w}</span>
                <Say text={col ? col.c : target.w} size={30} />
              </div>
              {col && (
                <div className="rd-pop-sub">
                  {target.w} · <i>{target.pos}</i> · /{target.ipa}/
                </div>
              )}
              {!col && (
                <div className="rd-pop-sub">
                  <i>{target.pos}</i> · /{target.ipa}/
                </div>
              )}
              {mode === "ru" ? (
                <>
                  {col && <div className="rd-pop-main">{col.ru}</div>}
                  <div className={col ? "rd-pop-note" : "rd-pop-main"}>{target.tr}</div>
                  {!col && <div className="rd-pop-note">{target.expl}</div>}
                </>
              ) : (
                <div className="rd-pop-main en">{target.def}</div>
              )}
            </>
          ) : gloss ? (
            <>
              <div className="rd-pop-h">
                <span className="rd-pop-w">{sel.text}</span>
                <Say text={sel.text} size={30} />
              </div>
              <div className="rd-pop-main">{mode === "ru" ? gloss.ru : gloss.en}</div>
              <div className="rd-pop-note">{mode === "ru" ? gloss.en : gloss.ru}</div>
            </>
          ) : null}
        </div>
      )}
    </article>
  );
}
