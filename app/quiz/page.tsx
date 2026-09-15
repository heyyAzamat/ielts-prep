import { Suspense } from "react";
import { Quiz } from "@/components/Quiz";

export default function QuizPage() {
  return (
    <Suspense>
      <Quiz />
    </Suspense>
  );
}
