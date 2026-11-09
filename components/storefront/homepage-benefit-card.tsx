"use client";

import { useRef, useState } from "react";

export function HomepageBenefitCard({ title, description, className = "" }: { title: string; description: string; className?: string }) {
  const [phase, setPhase] = useState<"idle" | "moving" | "done">("idle");
  const frame = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function enter() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    setPhase("idle");
    frame.current = requestAnimationFrame(() => {
      setPhase("moving");
      timer.current = setTimeout(() => setPhase("done"), 400);
    });
  }

  function leave() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (timer.current !== null) clearTimeout(timer.current);
    setPhase("idle");
  }

  const icon = benefitIcon(title);
  return <article onMouseEnter={enter} onMouseLeave={leave} className={`flex min-h-48 flex-col items-center justify-center rounded-xl bg-white px-4 py-6 text-center transition-shadow hover:shadow-md sm:min-h-56 sm:rounded-2xl ${className}`}>
    <span className="relative mb-3 grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-teal-600 text-white sm:mb-4 sm:h-[4.5rem] sm:w-[4.5rem]">
      <span className={`absolute inset-0 grid place-items-center ${phase === "moving" || phase === "done" ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"} ${phase === "moving" ? "transition-all duration-200 ease-in" : "transition-none"}`}>{icon}</span>
      <span aria-hidden="true" className={`absolute inset-0 grid place-items-center ${phase === "idle" ? "-translate-x-full opacity-0" : "translate-x-0 opacity-100"} ${phase === "moving" ? "transition-all delay-200 duration-200 ease-out" : "transition-none"}`}>{icon}</span>
    </span>
    <h3 className="font-semibold">{title}</h3>
    <p className="mt-1.5 text-sm leading-6 text-muted">{description}</p>
  </article>;
}

function benefitIcon(title: string) {
  const normalized = title.toLowerCase();
  if (/توصيل|شحن|delivery|shipping/.test(normalized)) return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-8 sm:w-8"><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7M7 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM18 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /></svg>;
  if (/جودة|طباعة|مصنوع|quality|print/.test(normalized)) return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-8 sm:w-8"><path d="M6 3.5h12v17l-6-3.8-6 3.8v-17Z" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-8 sm:w-8"><path d="M3 4h2l2.2 11h11L21 8H6M10 20a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6ZM17 20a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z" /></svg>;
}
