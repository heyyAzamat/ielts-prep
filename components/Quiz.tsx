"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BYID, DAY, INTERVAL, LESSONS, WORDS, parseScope, scopeKey, type Scope, type Word } from "@/lib/data";
import { preloadAudio, speak } from "@/lib/audio";
import { burst, celebrate } from "@/lib/fx";
import { useProgress } from "@/lib/progress";
import { distractors, lsGet, lsSet, pick, plural, shuffle, splitSentence, type Split } from "@/lib/util";
import { EntryDialog } from "./EntryDialog";
import { ScopeSelect } from "./ScopeSelect";

const QUIZ_TIME = 20000;
const TILES = [
  { c: "#E21B3C", shape: <polygon points="12,3 22,21 2,21" /> },
  { c: "#1368CE", shape: <polygon points="12,2 22,12 12,22 2,12" /> },
  { c: "#D89E00", shape: <circle cx="12" cy="12" r="10" /> },
  { c: "#26890C", shape: <rect x="3" y="3" width="18" height="18" /> },
];
type QType = "mc_en" | "mc_ru" | "mc_def" | "gap";
const QTYPES: QType[] = ["mc_en", "mc_ru", "mc_def", "gap"];
type Question = { id: string; type: QType; g: Split | null; opts: string[]; correct: string };
type Count = number | "all" | "inf";
type Cfg = { count: Count; shuffle: boolean };
type Session = { pool: Word[]; qs: Question[]; order: Word[]; oi: number; total: number };

function makeQ(w: Word, i: number, shuffled: boolean): Question {
  let type = shuffled ? pick(QTYPES) : QTYPES[i % 4];
  let g: Split | null = null;
  if (type === "gap") {
    g = splitSentence(w, pick(w.ex));
    if (!g) type = "mc_en";
  }
  const field = type === "mc_en" ? "tr" : "w";
  return { id: w.id, type, g, opts: shuffle([w[field], ...distractors(w, 3, field)]), correct: w[field] };
}

function ensureQ(s: Session, i: number, shuffled: boolean): Question {
  while (s.qs.length <= i) {
    if (s.oi >= s.order.length) {
      const next = shuffled ? shuffle(s.pool) : s.pool.slice();
      // avoid the same word twice in a row where two rounds meet
      const last = s.qs[s.qs.length - 1];
      if (last && next.length > 1 && next[0].id === last.id) next.push(next.shift()!);
      s.order = next;
      s.oi = 0;
    }
    s.qs.push(makeQ(s.order[s.oi++], s.qs.length, shuffled));
  }
  return s.qs[i];
}

function scopeInfo(scope: Scope) {
  if (scope.lesson) {
    const l = LESSONS[scope.lesson - 1];
    return { title: l.name, sub: `Unit ${l.unit} · ${l.unitName}` };
  }
  if (scope.unit) {
    const l = LESSONS.find((x) => x.unit === scope.unit)!;
    return { title: l.unitName, sub: `Unit ${scope.unit} · all 3 topics` };
  }
  if (scope.all) return { title: "All 600 words", sub: "Every unit" };
  return { title: "Review", sub: "Words due for a refresh" };
}

export function Quiz() {
  const router = useRouter();
  const params = useSearchParams();
  const scope = useMemo(() => parseScope(params.get("scope"), { due: true }), [params]);
  const { get, set, bump, ready } = useProgress();
  const info = scopeInfo(scope);

  const [cfg, setCfg] = useState<Cfg>({ count: 20, shuffle: true });
  useEffect(() => setCfg((c) => ({ ...c, ...lsGet<Partial<Cfg>>("szs-quiz", {}) })), []);
  const updateCfg = (patch: Partial<Cfg>) =>
    setCfg((c) => {
      const n = { ...c, ...patch };
      lsSet("szs-quiz", n);
      return n;
    });

  // Words for this scope; "due" is frozen when the quiz starts so answering doesn't shrink it.
  const pool = useMemo(() => {
    const now = Date.now();
    if (scope.lesson) return WORDS.filter((w) => w.lesson === scope.lesson);
    if (scope.unit) return WORDS.filter((w) => LESSONS[w.lesson - 1].unit === scope.unit);
    if (scope.all) return WORDS;
    return WORDS.filter((w) => {
      const p = get(w.id);
      return p.b > 0 && p.d <= now;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, ready]);

  const [phase, setPhase] = useState<"intro" | "count" | "q" | "end">("intro");
  const [countdown, setCountdown] = useState(3);
  const sess = useRef<Session | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null | undefined>(undefined); // undefined = not answered, null = time ran out
  const [score, setScore] = useState(0);
  const [lastPts, setLastPts] = useState(0);
  const [streakN, setStreakN] = useState(0);
  const [best, setBest] = useState(0);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [pop, setPop] = useState(0);
  const [shakeAt, setShakeAt] = useState(-1);
  const [openWord, setOpenWord] = useState<string | null>(null);
  const t0 = useRef(0);
  const bar = useRef<HTMLElement>(null);
  const secs = useRef<HTMLSpanElement>(null);
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);
  const nextBtn = useRef<HTMLButtonElement>(null);

  // back to the intro whenever the scope changes
  useEffect(() => {
    setPhase("intro");
  }, [scope]);

  const totalFor = (c: Count) => (c === "inf" ? Infinity : c === "all" ? pool.length : c);

  const start = () => {
    if (!pool.length) return;
    [...new Set(pool.map((w) => w.lesson))].slice(0, 6).forEach(preloadAudio);
    sess.current = { pool: pool.slice(), qs: [], order: [], oi: 0, total: totalFor(cfg.count) };
    setI(0);
    setPicked(undefined);
    setScore(0);
    setStreakN(0);
    setBest(0);
    setRight(0);
    setWrong([]);
    setCountdown(3);
    setPhase("count");
  };

  useEffect(() => {
    if (phase !== "count") return;
    const t = setTimeout(() => (countdown > 1 ? setCountdown(countdown - 1) : setPhase("q")), 750);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const s = sess.current;
  const q = phase === "q" && s ? ensureQ(s, i, cfg.shuffle) : null;
  const w = q ? BYID.get(q.id)! : null;

  const answer = useCallback(
    (opt: string | null, el?: HTMLElement | null) => {
      if (!q || picked !== undefined) return;
      const elapsed = performance.now() - t0.current;
      const ok = opt !== null && opt === q.correct;
      const p = { ...get(q.id) };
      if (ok) {
        const st = streakN + 1;
        const pts = Math.round(1000 * (1 - Math.min(elapsed, QUIZ_TIME) / QUIZ_TIME / 2)) + Math.min(st - 1, 5) * 100;
        setStreakN(st);
        setBest((b) => Math.max(b, st));
        setRight((r) => r + 1);
        setScore((x) => x + pts);
        setLastPts(pts);
        setPop((x) => x + 1);
        p.r++;
        p.b = Math.min(5, p.b + 1);
        p.d = Date.now() + INTERVAL[p.b] * DAY - 3600e3;
        if (el) {
          const r = el.getBoundingClientRect();
          burst(r.left + r.width / 2, r.top + r.height / 2, 28);
        }
      } else {
        setStreakN(0);
        setWrong((x) => [...x, q.id]);
        setShakeAt(i);
        p.x++;
        p.b = Math.max(1, p.b - 1);
        p.d = Date.now() + 10 * 60e3;
      }
      set(q.id, p);
      bump();
      setPicked(opt);
    },
    [q, picked, get, set, bump, streakN, i],
  );

  // timer
  useEffect(() => {
    if (phase !== "q" || picked !== undefined) return;
    t0.current = performance.now();
    let raf = 0;
    const loop = () => {
      const left = Math.max(0, QUIZ_TIME - (performance.now() - t0.current));
      if (bar.current) {
        bar.current.style.transform = `scaleX(${left / QUIZ_TIME})`;
        bar.current.classList.toggle("low", left < 5000);
      }
      if (secs.current) secs.current.textContent = String(Math.ceil(left / 1000));
      if (left <= 0) return answer(null);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, i, picked, answer]);

  // speak the word on "what does it mean?" questions
  useEffect(() => {
    if (q?.type === "mc_en" && w) {
      const t = setTimeout(() => speak(w.w), 250);
      return () => clearTimeout(t);
    }
  }, [q, w]);

  useEffect(() => {
    if (picked !== undefined) nextBtn.current?.focus();
  }, [picked]);

  const next = useCallback(() => {
    if (!s) return;
    if (i + 1 >= s.total) {
      setPhase("end");
      return;
    }
    setPicked(undefined);
    setI(i + 1);
  }, [s, i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,textarea,select") || document.querySelector("dialog[open]")) return;
      if (phase === "intro" && e.key === "Enter") {
        e.preventDefault();
        start();
      } else if (phase === "q" && q) {
        if (picked === undefined && /^[1-4]$/.test(e.key)) {
          const k = +e.key - 1;
          answer(q.opts[k], tiles.current[k]);
        } else if (picked !== undefined && e.key === "Enter") {
          e.preventDefault();
          next();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (phase !== "end") return;
    const n = right + wrong.length;
    if (n && right / n >= 0.7) celebrate();
  }, [phase, right, wrong.length]);

  // ---------- intro ----------
  if (phase === "intro" || phase === "count") {
    const tot = totalFor(cfg.count);
    const counts: [Count, string][] = [[10, "10"], [20, "20"], [40, "40"], ["all", `All (${pool.length})`], ["inf", "∞ Endless"]];
    return (
      <section className="kq kq-intro">
        <div className="label">{info.sub}</div>
        <h1>{info.title}</h1>
        {phase === "intro" ? (
          <>
            <div className="kq-setup">
              <label className="kq-field">
                <span>Words</span>
                <ScopeSelect
                  id="qscope"
                  value={scope}
                  onChange={(k) => router.replace(`/quiz?scope=${k}`)}
                  extra={[
                    { value: "due", label: "Due for review" },
                    { value: "all", label: "All 600 words" },
                  ]}
                />
              </label>
              <div className="kq-field">
                <span>Questions</span>
                <div className="seg" role="group" aria-label="Number of questions">
                  {counts.map(([v, t]) => (
                    <button key={String(v)} aria-pressed={cfg.count === v} onClick={() => updateCfg({ count: v })}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="kq-field">
                <span>Order</span>
                <div className="seg" role="group" aria-label="Order">
                  <button aria-pressed={cfg.shuffle} onClick={() => updateCfg({ shuffle: true })}>
                    ⤮ Shuffle
                  </button>
                  <button aria-pressed={!cfg.shuffle} onClick={() => updateCfg({ shuffle: false })}>
                    Book order
                  </button>
                </div>
              </div>
            </div>
            <p className="muted">
              {pool.length
                ? `${pool.length} ${plural(pool.length, "word", "words")} · ${
                    tot === Infinity ? "endless — finish any time" : `${tot} ${plural(tot, "question", "questions")}`
                  } · 20 seconds each${tot > pool.length && tot !== Infinity ? " · words repeat in new question types" : ""}`
                : "No words are due right now — pick a topic or all words."}
            </p>
            <button className="pearl" onClick={start} disabled={!pool.length}>
              Let&apos;s go
            </button>
          </>
        ) : (
          <div className="kq-count" key={countdown}>
            {countdown}
          </div>
        )}
      </section>
    );
  }

  // ---------- results ----------
  if (phase === "end" || !q || !w || !s) {
    const n = right + wrong.length;
    const acc = n ? Math.round((right / n) * 100) : 0;
    const medal = acc >= 90 ? "Brilliant" : acc >= 70 ? "Great result" : acc >= 40 ? "Good start" : "Needs more practice";
    const missed = [...new Set(wrong)].map((id) => BYID.get(id)!);
    return (
      <section className="kq kq-end">
        <div className="label">{info.title}</div>
        <h1>{medal}</h1>
        <div className="kq-podium">
          <div>
            <CountUp value={score} />
            <span>points</span>
          </div>
          <div>
            <b className="tn">
              {right}/{n}
            </b>
            <span>correct · {acc}%</span>
          </div>
          <div>
            <b className="tn">{best}</b>
            <span>best streak</span>
          </div>
        </div>
        {missed.length > 0 && (
          <div className="kq-miss">
            <div className="label">Review these words</div>
            {missed.map((m) => (
              <button className="item" key={m.id} onClick={() => setOpenWord(m.id)}>
                <span className="w">{m.w}</span>
                <span className="t">{m.tr}</span>
                <span />
              </button>
            ))}
          </div>
        )}
        <div className="card-acts" style={{ marginTop: 26 }}>
          <button className="pearl sm" onClick={() => setPhase("intro")}>
            Play again
          </button>
          {scope.lesson && (
            <Link className="btn" href={`/cards?scope=l${scope.lesson}`}>
              Topic flashcards
            </Link>
          )}
          {scope.lesson && scope.lesson < LESSONS.length && (
            <Link className="btn" href={`/quiz?scope=l${scope.lesson + 1}`}>
              Next topic
            </Link>
          )}
          <Link className="btn" href="/">
            Back to units
          </Link>
        </div>
        <EntryDialog id={openWord} onClose={() => setOpenWord(null)} />
      </section>
    );
  }

  // ---------- question ----------
  const answered = picked !== undefined;
  const ok = answered && picked === q.correct;
  return (
    <section className="kq" key={`q-${scopeKey(scope)}`}>
      <div className="kq-top">
        <span className="kq-n tn">
          {i + 1}
          <span>{s.total === Infinity ? " · ∞" : `/${s.total}`}</span>
        </span>
        <span className={`kq-score tn ${pop ? "pop" : ""}`} key={`score-${pop}`}>
          {score.toLocaleString("en-US")}
        </span>
        <button
          className="btn sm"
          onClick={() => {
            if (i === 0 || s.total === Infinity || confirm("End the quiz? Answers so far will be saved.")) setPhase("end");
          }}
        >
          {s.total === Infinity ? "Finish" : "Quit"}
        </button>
      </div>
      <div className="kq-q" key={`prompt-${i}`}>
        {q.type === "mc_en" && (
          <>
            <div className="kq-hint">What does it mean?</div>
            <div className="kq-word">{w.w}</div>
          </>
        )}
        {q.type === "mc_ru" && (
          <>
            <div className="kq-hint">How do you say it in English?</div>
            <div className="kq-word ru">{w.tr}</div>
          </>
        )}
        {q.type === "mc_def" && (
          <>
            <div className="kq-hint">Which word fits?</div>
            <div className="kq-word def">{w.def}</div>
          </>
        )}
        {q.type === "gap" && q.g && (
          <>
            <div className="kq-hint">Fill the gap</div>
            <div className="kq-word gapq">
              {q.g.before}
              <span className="gap">?</span>
              {q.g.after}
            </div>
          </>
        )}
      </div>
      <div className="kq-timer">
        <i ref={bar} key={`bar-${i}`} />
        <span ref={secs} className="tn">
          20
        </span>
      </div>
      <div className={`kq-grid ${shakeAt === i ? "shake" : ""}`} key={`grid-${i}`}>
        {q.opts.map((o, k) => {
          const cls = !answered ? "" : o === q.correct ? "right" : o === picked ? "wrong" : "dim";
          return (
            <button
              key={o}
              ref={(el) => {
                tiles.current[k] = el;
              }}
              className={`kq-opt ${cls}`}
              style={{ ["--c" as string]: TILES[k].c, ["--d" as string]: `${k * 60}ms` }}
              disabled={answered}
              onClick={(e) => answer(o, e.currentTarget)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {TILES[k].shape}
              </svg>
              <span>{o}</span>
              <kbd>{k + 1}</kbd>
            </button>
          );
        })}
      </div>
      <div className={`kq-fb ${answered ? `show ${ok ? "good" : "bad"}` : ""}`}>
        {answered && (
          <>
            <div className="kq-verdict">
              {ok ? "Correct" : picked ? "Wrong" : "Time's up"}
              {ok && <b className="tn">+{lastPts}</b>}
            </div>
            <div className="kq-answer">
              <span>{w.w}</span> — {w.tr}
            </div>
            <button className="pearl sm" ref={nextBtn} onClick={next}>
              {i + 1 < s.total ? "Next" : "Results"}
              <span className="kbd">Enter</span>
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 1200);
      if (ref.current) ref.current.textContent = Math.round(value * (1 - Math.pow(1 - k, 3))).toLocaleString("en-US");
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <b className="tn" ref={ref}>
      0
    </b>
  );
}
