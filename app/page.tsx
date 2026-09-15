"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Garden } from "@/components/Garden";
import { burst } from "@/lib/fx";
import { LESSONS, STAGE_COL, UNITS, WORDS } from "@/lib/data";
import { globalStats, lessonStats, nextLesson, streak, useProgress } from "@/lib/progress";
import { plural } from "@/lib/util";

function Chars({ text }: { text: string }) {
  return (
    <>
      {[...text].map((c, i) =>
        c === " " ? (
          " "
        ) : (
          <span key={i} className="ch" style={{ ["--i" as string]: i }}>
            {c}
          </span>
        ),
      )}
    </>
  );
}

export default function Home() {
  const router = useRouter();
  const { get, stats } = useProgress();
  const g = globalStats(get);
  const nl = nextLesson(get);
  const started = WORDS.length - g.byBox[0];
  const days = streak(stats);
  const cta =
    g.due > 0
      ? { t: `Review ${g.due} ${plural(g.due, "word", "words")}`, s: "These words are due — the best moment to lock them in", href: "/quiz?scope=due" }
      : { t: started ? "Continue" : "Start the first topic", s: `Next topic: ${nl.name} · Unit ${nl.unit}`, href: `/quiz?scope=l${nl.n}` };

  return (
    <>
      <section className="hero">
        <Garden />
        <div className="hero-in">
          <h1>
            <Chars text="600 words that" />
          </h1>
          <div className="pill">stay</div>
          <p className="lead">
            Vocabulary from <span className="s">Essential Words for the IELTS</span> — examples, flashcards and quizzes.
          </p>
          <div className="cta">
            <button
              className="pearl"
              onPointerDown={(e) => burst(e.clientX, e.clientY, 26)}
              onClick={() => router.push(cta.href)}
            >
              {cta.t}
            </button>
            <small>{cta.s}</small>
          </div>
          <div className="foot">
            <span className="tn">
              {started}/{WORDS.length} in progress
            </span>
            <span>
              learn. recall. <span className="s">use</span>
            </span>
            <span className="tn">
              {days} {plural(days, "day", "days")} streak
            </span>
          </div>
        </div>
      </section>

      <div className="sec-h">
        <h2>Units</h2>
        <span className="muted" style={{ fontSize: 18 }}>
          10 units · 30 topics · 20 words each
        </span>
      </div>
      <section className="units">
        {UNITS.map((u, i) => {
          const ls = LESSONS.filter((l) => l.unit === u);
          return (
            <article
              key={u}
              className="unit"
              style={{ ["--i" as string]: i }}
              onPointerMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
              }}
            >
              <div className="unit-h">
                <span className="no">{u}</span>
                <div>
                  <h3>{ls[0].unitName}</h3>
                </div>
              </div>
              {ls.map((l) => {
                const s = lessonStats(get, l.n);
                return (
                  <div className="lesson" key={l.n}>
                    <Link className="name" href={`/topic/${l.n}`}>
                      {s.due > 0 && <span className="due-dot" title="Words due for review" />}
                      {l.name}
                    </Link>
                    <div className="acts">
                      <Link className="btn sm read" href={`/read/${l.n}`}>
                        Read
                      </Link>
                      <Link className="btn sm" href={`/cards?scope=l${l.n}`}>
                        Flashcards
                      </Link>
                      <Link className="btn sm test" href={`/quiz?scope=l${l.n}`}>
                        Quiz
                      </Link>
                    </div>
                    <div className="meter">
                      <div className="track">
                        {s.byBox.map((n, k) => (k && n ? <i key={k} style={{ width: `${(n / s.total) * 100}%`, background: STAGE_COL[k] }} /> : null))}
                      </div>
                      <span className="tn">
                        {s.total - s.fresh}/{s.total}
                        {s.due ? ` · ${s.due} due` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </article>
          );
        })}
      </section>
    </>
  );
}
