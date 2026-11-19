"use client";

import { useEffect, useRef, useState } from "react";

export type StorefrontSelectOption = { value: string; label: string };

export function StorefrontSelect({
  value,
  options,
  onChange,
  ariaLabel,
  triggerClassName,
  disabled = false,
}: {
  value: string;
  options: StorefrontSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  triggerClassName: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    function closeOnOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`flex min-w-0 items-center justify-between gap-2 text-text transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${triggerClassName}`}
      >
        <span className="min-w-0 flex-1 whitespace-normal break-words text-start leading-5 text-text">
          {selectedOption?.label ?? "اختر من القائمة"}
        </span>
        <span aria-hidden="true" className={`shrink-0 text-text transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open ? <div role="group" aria-label={ariaLabel} className="absolute inset-x-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-white p-2 shadow-xl">
        {options.map((option) => {
          const selected = option.value === value;
          return <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              setOpen(false);
              onChange(option.value);
            }}
            className={`flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-start text-sm text-text transition hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected ? "bg-primary/5 font-semibold" : ""}`}
          >
            <span className="min-w-0 flex-1 whitespace-normal break-words leading-5 text-text">{option.label}</span>
          </button>;
        })}
      </div> : null}
    </div>
  );
}
