const FILE_SIGNATURES: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) => bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]),
  "image/webp": (bytes) => bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP",
  "application/pdf": (bytes) => bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-",
};

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

/** Checks the file's leading bytes instead of trusting the browser-provided MIME type. */
export function hasValidPaymentProofSignature(mimeType: string, bytes: Uint8Array) {
  return FILE_SIGNATURES[mimeType]?.(bytes) ?? false;
}
