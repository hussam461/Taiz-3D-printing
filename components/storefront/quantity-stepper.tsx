"use client";

import { useState } from "react";
import { MAX_CART_QUANTITY } from "@/types/domain";

export function QuantityStepper({
  quantity,
  onChange,
  className = "",
}: {
  quantity: number;
  onChange: (quantity: number) => void;
  className?: string;
}) {
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const inputValue = draftValue ?? String(quantity);

  function update(next: number) {
    const normalized = Math.max(1, Math.min(MAX_CART_QUANTITY, Math.floor(next)));
    setDraftValue(null);
    onChange(normalized);
  }

  function handleInput(value: string) {
    const westernValue = toWesternDigits(value);
    if (!/^\d*$/.test(westernValue) || westernValue.length > String(MAX_CART_QUANTITY).length) return;
    if (westernValue && Number(westernValue) > MAX_CART_QUANTITY) return;
    setDraftValue(westernValue);
    const parsed = Number(westernValue);
    if (parsed > 0) onChange(parsed);
  }

  function normalizeInput() {
    update(draftValue ? Number(draftValue) || quantity : quantity);
  }

  return (
    <div role="group" aria-label="الكمية" className={`flex h-10 items-center overflow-hidden rounded-lg border border-border bg-white ${className}`}>
      <button type="button" aria-label="تقليل الكمية" disabled={quantity <= 1} onClick={() => update(quantity - 1)} className="inline-flex h-full w-10 shrink-0 items-center justify-center text-lg text-muted transition-colors hover:bg-slate-50 hover:text-text disabled:cursor-not-allowed disabled:opacity-40">−</button>
      <input type="text" inputMode="numeric" pattern="[0-9]*" dir="ltr" lang="en" aria-label="الكمية" value={inputValue} onChange={(event) => handleInput(event.target.value)} onBlur={normalizeInput} className="h-full min-w-0 flex-1 border-x border-border bg-transparent text-center text-sm font-semibold tabular-nums outline-none" />
      <button type="button" aria-label="زيادة الكمية" disabled={quantity >= MAX_CART_QUANTITY} onClick={() => update(quantity + 1)} className="inline-flex h-full w-10 shrink-0 items-center justify-center text-lg text-muted transition-colors hover:bg-slate-50 hover:text-text disabled:cursor-not-allowed disabled:opacity-40">+</button>
    </div>
  );
}

function toWesternDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}
