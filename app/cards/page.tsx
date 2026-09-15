import { Suspense } from "react";
import { Flashcards } from "@/components/Flashcards";

export default function CardsPage() {
  return (
    <Suspense>
      <Flashcards />
    </Suspense>
  );
}
