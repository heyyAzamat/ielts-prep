"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BYID, DAY, LESSONS, WORDS, parseScope, scopeKey, type Scope } from "@/lib/data";
import { preloadAudio } from "@/lib/audio";
import { useProgress } from "@/lib/progress";
import { lsGet, lsSet, plural, prefersReducedMotion, shuffle } from "@/lib/util";
import { Highlight } from "./Highlight";
import { Say, SpeakIcon } from "./Say";
import { ScopeSelect } from "./ScopeSelect";
import { speak } from "@/lib/audio";

type Deck = { items: string[]; i: number; known: number; again: number; total: number };
const FLIP_MS = 780;

function deckWords(scope: Scope, get: (id: string) => { b: number; d: number }) {
  const now = Date.now();
  if (scope.lesson) return WORDS.filter((w) => w.lesson === scope.lesson);
  if (scope.unit) return WORDS.filter((w) => LESSONS[w.lesson - 1].unit === scope.unit);
  if (scope.all) return WORDS;
  if (scope.due) return WORDS.filter((w) => { const p = get(w.id); return p.b > 0 && p.d <= now; });
  return WORDS.filter((w) => get(w.id).b > 0);
}

export function Flashcards() {
  const router = useRouter();
  const params = useSearchParams();
  const scope = useMemo(() => parseScope(params.get("scope")), [params]);
  const { get, set, bump, ready } = useProgress();

  const [mode, setMode] = useState<"ru" | "en">("ru");
  useEffect(() => setMode(lsGet<"ru" | "en">("szs-mode", "ru")), []);
  const changeMode = (m: "ru" | "en") => {
    setMode(m);
    lsSet("szs-mode", m);
  };

  const [deck, setDeck] = useState<Deck | null>(null);
  const buildDeck = useCallback(() => {
    const ws = deckWords(scope, get);
    [...new Set(ws.map((w) => w.lesson))].slice(0, 3).forEach(preloadAudio);
    setDeck({ items: shuffle(ws.map((w) => w.id)), i: 0, known: 0, again: 0, total: ws.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, ready]);
  useEffect(() => {
    if (ready) buildDeck();
  }, [buildDeck, ready]);

  // flip state
  const [flipped, setFlipped] = useState(false);
  const [side, setSide] = useState<"front" | "back">("front");
  const [flipping, setFlipping] = useState(false);
  const [dir, setDir] = useState(1);
  const [out, setOut] = useState<"" | "out-r" | "out-l">("");
  const angle = useRef(0);
  const flipper = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const rating = useRef(false);

  const current = deck && deck.i < deck.items.length ? BYID.get(deck.items[deck.i])! : null;

  // new card: reset rotation without animating
  useLayoutEffect(() => {
    angle.current = 0;
    setFlipped(false);
    setSide("front");
    setOut("");
    const f = flipper.current;
    if (f) {
      f.style.transition = "none";
      f.style.transform = "rotateY(0deg)";
      void f.offsetWidth;
      f.style.transition = "";
    }
  }, [current?.id]);

  // card height = taller of the two faces
  useLayoutEffect(() => {
    const fit = () => {
      if (flipper.current && front.current && back.current)
        flipper.current.style.height = Math.max(front.current.scrollHeight, back.current.scrollHeight) + "px";
    };
    fit();
    document.fonts?.ready.then(fit);
  }, [current?.id, mode]);

  const flip = useCallback(
    (d = 1) => {
      const f = flipper.current;
      if (!f || !current) return;
      const nextFlipped = !flipped;
      setFlipped(nextFlipped);
      angle.current += d * 180;
      const target = nextFlipped ? "back" : "front";
      if (prefersReducedMotion()) {
        f.style.transform = `rotateY(${angle.current}deg)`;
        setSide(target);
        return;
      }
      setDir(d);
      setFlipping(false);
      requestAnimationFrame(() => setFlipping(true));
      f.style.transform = `rotateY(${angle.current}deg)`;
      cancelAnimationFrame(raf.current);
      clearTimeout(timer.current);
      const watch = () => {
        // m11 = cos(angle): negative means the back face is turned towards us
        const m = new DOMMatrix(getComputedStyle(f).transform);
        setSide(m.m11 < 0 ? "back" : "front");
        raf.current = requestAnimationFrame(watch);
      };
      raf.current = requestAnimationFrame(watch);
      timer.current = setTimeout(() => {
        cancelAnimationFrame(raf.current);
        setFlipping(false);
        setSide(target);
      }, FLIP_MS + 40);
    },
    [flipped, current],
  );

  const rateNow = useCallback(
    (ok: boolean) => {
      if (!deck || !current) return;
      const p = { ...get(current.id) };
      const d = { ...deck, items: deck.items.slice() };
      if (ok) {
        d.known++;
        if (p.b === 0) {
          p.b = 1;
          p.d = Date.now() + DAY - 3600e3;
        }
      } else {
        d.again++;
        d.items.splice(Math.min(d.items.length, d.i + 5), 0, current.id);
        if (p.b > 1) {
          p.b = Math.max(1, p.b - 1);
          p.d = Date.now() + 10 * 60e3;
        }
      }
      set(current.id, p);
      bump();
      d.i++;
      setDeck(d);
    },
    [deck, current, get, set, bump],
  );

  const rate = useCallback(
    (ok: boolean) => {
      if (rating.current || !current) return;
      if (prefersReducedMotion()) return rateNow(ok);
      rating.current = true;
      setOut(ok ? "out-r" : "out-l");
      setTimeout(() => {
        rating.current = false;
        rateNow(ok);
      }, 360);
    },
    [current, rateNow],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,textarea,select") || document.querySelector("dialog[open]")) return;
      if (!current) return;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        flip(1);
      } else if (e.key === "1" || e.key === "ArrowLeft") rate(false);
      else if (e.key === "2" || e.key === "ArrowRight") rate(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, flip, rate]);

  // touch: tap flips, swipe rates
  const touch = useRef<{ x: number; y: number; swiped: boolean } | null>(null);
  const swipedFlag = useRef(false);

  const head = (
    <div className="page-h" style={{ marginTop: 14, justifyContent: "center" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
        <ScopeSelect
          id="scope"
          value={scope}
          onChange={(k) => router.replace(`/cards?scope=${k}`)}
          extra={[
            { value: "due", label: "Due for review" },
            { value: "seen", label: "All started words" },
            { value: "all", label: "All 600 words" },
          ]}
        />
        <div className="seg" role="group" aria-label="Mode">
          <button aria-pressed={mode === "ru"} onClick={() => changeMode("ru")}>
            RU · translation
          </button>
          <button aria-pressed={mode === "en"} onClick={() => changeMode("en")}>
            EN · explanation
          </button>
        </div>
      </div>
    </div>
  );

  let body: React.ReactNode = null;
  if (!deck) body = null;
  else if (!deck.total)
    body = (
      <div className="glass done">
        <h2>Nothing here yet</h2>
        <p className="muted">{scope.due ? "No words are due — great job." : "Start any topic and its words will show up here."}</p>
        <div className="card-acts">
          <button className="btn" onClick={() => router.replace("/cards?scope=l1")}>
            Open Unit 1
          </button>
        </div>
      </div>
    );
  else if (!current)
    body = (
      <div className="glass done">
        <div className="label">Deck complete</div>
        <h2 style={{ margin: "12px 0" }}>
          Knew {deck.known} of {deck.total}
        </h2>
        <p className="muted">
          {deck.again ? `${deck.again} ${plural(deck.again, "time", "times")} a word went back into the deck.` : "Every word on the first try."}
        </p>
        <div className="card-acts">
          <button className="btn" onClick={buildDeck}>
            Again
          </button>
          <button className="pearl sm" onClick={() => router.push(`/quiz?scope=${scopeKey(scope.seen ? { due: true } : scope)}`)}>
            Take the quiz
          </button>
        </div>
      </div>
    );
  else {
    const w = current;
    body = (
      <>
        <div className="prog">
          <span className="tn">
            {deck.i + 1}/{deck.items.length}
          </span>
          <div className="track">
            <i style={{ width: `${(deck.i / deck.items.length) * 100}%` }} />
          </div>
          <span>
            known <span className="tn">{deck.known}</span>
          </span>
        </div>
        <div className={`flash ${out}`} key={w.id}>
          <div className="tiltw" ref={tilt}>
            <div
              className={`flipper ${flipping ? "flipping" : ""}`}
              ref={flipper}
              data-side={side}
              style={{ ["--dir" as string]: dir }}
              onClick={(e) => {
                if (swipedFlag.current) {
                  swipedFlag.current = false;
                  return;
                }
                const r = e.currentTarget.getBoundingClientRect();
                flip(e.clientX < r.left + r.width / 2 ? -1 : 1);
              }}
              onPointerMove={(e) => {
                if (e.pointerType !== "mouse" || prefersReducedMotion() || !tilt.current) return;
                const r = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - 0.5;
                const y = (e.clientY - r.top) / r.height - 0.5;
                tilt.current.style.transform = `rotateY(${x * 6}deg) rotateX(${-y * 5}deg)`;
                e.currentTarget.querySelectorAll<HTMLElement>(".card").forEach((c) => {
                  c.style.setProperty("--x", `${e.clientX - r.left}px`);
                  c.style.setProperty("--y", `${e.clientY - r.top}px`);
                });
              }}
              onPointerLeave={() => tilt.current && (tilt.current.style.transform = "")}
              onTouchStart={(e) => {
                const t = e.touches[0];
                touch.current = { x: t.clientX, y: t.clientY, swiped: false };
              }}
              onTouchMove={(e) => {
                const s = touch.current;
                const tw = tilt.current;
                if (!s || !tw) return;
                const t = e.touches[0];
                const dx = t.clientX - s.x;
                const dy = t.clientY - s.y;
                if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
                  tw.style.transition = "none";
                  tw.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`;
                  tw.style.opacity = String(Math.max(0.4, 1 - Math.abs(dx) / 400));
                }
              }}
              onTouchEnd={(e) => {
                const s = touch.current;
                const tw = tilt.current;
                touch.current = null;
                if (!s || !tw) return;
                const dx = e.changedTouches[0].clientX - s.x;
                tw.style.transition = "";
                tw.style.transform = "";
                tw.style.opacity = "";
                if (Math.abs(dx) > 70) {
                  swipedFlag.current = true;
                  rate(dx > 0);
                }
              }}
            >
              <div className="card front" ref={front}>
                <div className="side">
                  <Say text={w.w} size={34} />
                </div>
                <div className="word">{w.w}</div>
                <div className="sub">
                  <span>/{w.ipa}/</span>
                </div>
                <div className="shine" />
              </div>
              <div className="card back" ref={back}>
                <div className="side">
                  <Say text={w.w} size={34} />
                </div>
                {mode === "ru" ? <div className="answer-big">{w.tr}</div> : <div className="answer-def">{w.def}</div>}
                {w.cols.length > 0 && (
                  <ul className="cols">
                    {w.cols.map((c) => (
                      <li
                        key={c.c}
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(c.c);
                        }}
                      >
                        <span className="cc">
                          <Highlight w={w} e={{ en: c.c, ru: "" }} />{" "}
                          <i className="play">
                            <SpeakIcon />
                          </i>
                        </span>
                        {mode === "ru" && <span className="cr">{c.ru}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="shine" />
              </div>
            </div>
          </div>
        </div>
        <div className="swipe-hint">tap to flip · swipe → know · swipe ← don&apos;t know</div>
        <div className="card-acts">
          <button className="btn" onClick={() => rate(false)}>
            Don&apos;t know<span className="kbd">1</span>
          </button>
          <button className="btn" onClick={() => flip(1)}>
            Flip<span className="kbd">space</span>
          </button>
          <button className="pearl sm" onClick={() => rate(true)}>
            Know it<span className="kbd">2</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="stage" style={{ maxWidth: 760 }}>
      {head}
      {body}
    </div>
  );
}
