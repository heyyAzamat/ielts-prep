"use client";
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent("wbw-toast", { detail: message }));
}
