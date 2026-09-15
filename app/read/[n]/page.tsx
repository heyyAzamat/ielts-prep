import { notFound } from "next/navigation";
import { Reading } from "@/components/Reading";
import { LESSONS } from "@/lib/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return LESSONS.map((l) => ({ n: String(l.n) }));
}

export default async function ReadPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const lesson = LESSONS[Number(n) - 1];
  if (!lesson) notFound();
  return <Reading lesson={lesson.n} />;
}
