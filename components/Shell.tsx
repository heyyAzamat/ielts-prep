"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { installAudioUnlock } from "@/lib/audio";
import { startAmbient } from "@/lib/fx";
import { ProgressProvider } from "@/lib/progress";
import { LogoMark } from "./LogoMark";

const NAV = [
  { href: "/", label: "Units", match: (p: string) => p === "/" || p.startsWith("/topic") || p.startsWith("/quiz") },
  { href: "/cards", label: "Flashcards", match: (p: string) => p.startsWith("/cards") },
  { href: "/words", label: "All words", match: (p: string) => p.startsWith("/words") },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const amb = useRef<HTMLCanvasElement>(null);
  const fx = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    installAudioUnlock();
    if (amb.current && fx.current) return startAmbient(amb.current, fx.current);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <ProgressProvider>
      <canvas id="ambient" ref={amb} aria-hidden="true" />
      <canvas id="fx" ref={fx} aria-hidden="true" />
      <div className="wrap">
        <header className="top">
          <Link className="brand" href="/" aria-label="Word by Word — home">
            <LogoMark />
            <span className="logo-word">
              word <span className="z">by</span> word
            </span>
          </Link>
          <nav>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="nav-link" aria-current={n.match(pathname) ? "page" : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main key={pathname} className={pathname === "/" ? undefined : "enter"} id="view">
          {children}
        </main>
      </div>
      <Toast />
    </ProgressProvider>
  );
}

function Toast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 2400);
    };
    window.addEventListener("wbw-toast", on);
    return () => window.removeEventListener("wbw-toast", on);
  }, []);
  return (
    <div className="toast" role="status" hidden={!msg}>
      {msg}
    </div>
  );
}
