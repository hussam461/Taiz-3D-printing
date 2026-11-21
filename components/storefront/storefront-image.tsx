"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/** Use Vercel's optimized image first, then fall back to the public source if optimization fails. */
export function StorefrontImage({ alt, onError, unoptimized, ...props }: ImageProps) {
  const [useOriginalSource, setUseOriginalSource] = useState(false);

  return (
    <Image
      {...props}
      alt={alt}
      unoptimized={Boolean(unoptimized || useOriginalSource)}
      onError={(event) => {
        if (!unoptimized) setUseOriginalSource(true);
        onError?.(event);
      }}
    />
  );
}
