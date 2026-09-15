import type { Example, Word } from "@/lib/data";
import { splitSentence } from "@/lib/util";

/** Sentence with the target word underlined. */
export function Highlight({ w, e }: { w: Word; e: Example }) {
  const s = splitSentence(w, e);
  if (!s) return <>{e.en}</>;
  return (
    <>
      {s.before}
      <mark>{s.form}</mark>
      {s.after}
    </>
  );
}
