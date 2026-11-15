"use client";

import { forwardRef, useEffect, useRef, useState, type ChangeEvent, type ComponentPropsWithoutRef } from "react";
import { compressImageToWebp, formatImageFileSize } from "@/lib/compress-image";

type WebpImageInputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  maxDimension?: number;
  maxBytes?: number;
  onPrepared?: (file: File) => void;
  onCleared?: () => void;
  statusClassName?: string;
};

export const WebpImageInput = forwardRef<HTMLInputElement, WebpImageInputProps>(function WebpImageInput(
  { maxDimension = 1800, maxBytes = 1_500_000, onChange, onPrepared, onCleared, statusClassName, ...props },
  forwardedRef,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const generationRef = useRef(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const input = inputRef.current;
    const form = input?.form;
    if (!input || !form) return;
    const clearOnReset = () => {
      generationRef.current += 1;
      input.setCustomValidity("");
      setStatus("");
    };
    const clearPreparedFile = () => {
      generationRef.current += 1;
      input.setCustomValidity("");
      setStatus("");
      onCleared?.();
    };
    form.addEventListener("reset", clearOnReset);
    input.addEventListener("webp-clear", clearPreparedFile);
    return () => {
      form.removeEventListener("reset", clearOnReset);
      input.removeEventListener("webp-clear", clearPreparedFile);
    };
  }, [onCleared]);

  function setRef(node: HTMLInputElement | null) {
    inputRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange?.(event);
    const input = event.currentTarget;
    const originalFile = input.files?.[0];
    const generation = ++generationRef.current;
    if (!originalFile) {
      input.setCustomValidity("");
      setStatus("");
      return;
    }

    input.setCustomValidity("يجري تجهيز الصورة. انتظر حتى ينتهي التحويل إلى WebP.");
    setStatus("جارٍ تجهيز الصورة بصيغة WebP...");
    try {
      const preparedFile = await compressImageToWebp(originalFile, { maxDimension, maxBytes });
      if (generation !== generationRef.current || input.files?.[0] !== originalFile) return;
      const transfer = new DataTransfer();
      transfer.items.add(preparedFile);
      input.files = transfer.files;
      input.setCustomValidity("");
      setStatus(`تم تجهيز الصورة بصيغة WebP · ${formatImageFileSize(preparedFile.size)}`);
      onPrepared?.(preparedFile);
    } catch (error) {
      if (generation !== generationRef.current) return;
      const message = error instanceof Error ? error.message : "تعذر تجهيز الصورة. اختر صورة أخرى.";
      input.setCustomValidity(message);
      setStatus(message);
    }
  }

  return <>
    <input {...props} ref={setRef} data-webp-image-input="true" type="file" onChange={handleChange} />
    {status ? <p role={status.startsWith("تم تجهيز") ? "status" : "alert"} className={`${statusClassName ?? "mt-1 text-xs leading-5"} ${status.startsWith("تعذر") ? "text-red-700" : "text-muted"}`}>{status}</p> : null}
  </>;
});
