import { notFound } from "next/navigation";
import { Topic } from "@/components/Topic";
import { LESSONS } from "@/lib/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return LESSONS.map((l) => ({ n: String(l.n) }));
}

export default async function TopicPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const lesson = LESSONS[Number(n) - 1];
  if (!lesson) notFound();
  return <Topic lesson={lesson.n} />;
}
