"use client";
import { speak } from "@/lib/audio";

export const SpeakIcon = ({ size }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={size ? { width: size, height: size } : undefined} aria-hidden="true">
    <path d="M11 5 6 9H3v6h3l5 4V5z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
  </svg>
);

export function Say({ text, size }: { text: string; size?: number }) {
  return (
    <button
      type="button"
      className="say"
      aria-label={`Play “${text}”`}
      style={size ? { width: size, height: size } : undefined}
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
    >
      <SpeakIcon />
    </button>
  );
}
