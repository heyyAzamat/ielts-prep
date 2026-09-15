"use client";
import { useEffect, useRef } from "react";
import { startGarden } from "@/lib/garden";

export function Garden() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => (ref.current ? startGarden(ref.current) : undefined), []);
  return <canvas ref={ref} id="garden" aria-hidden="true" />;
}
