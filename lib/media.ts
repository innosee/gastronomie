// Validierung & Konstanten für die Media-Library. Analog zu lib/menu-categories.ts
// (Magic-Byte-Check statt blindem Vertrauen auf den MIME-Typ des Clients).

export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

// Erlaubte Bildtypen. Key = kanonischer contentType, value = Dateiendung fürs Blob.
export const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
} as const;

export type ImageContentType = keyof typeof ALLOWED_IMAGE_TYPES;

export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_IMAGE_TYPES).join(',');

export function isAllowedImageType(value: string): value is ImageContentType {
  return value in ALLOWED_IMAGE_TYPES;
}

// Erkennt den Bildtyp anhand der Magic Bytes im Header — unabhängig vom
// (fälschbaren) MIME-Typ oder Dateinamen. Gibt null zurück, wenn nichts passt.
export function sniffImageType(header: Uint8Array): ImageContentType | null {
  const b = header;
  // JPEG: FF D8 FF
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return 'image/png';
  }
  // GIF: "GIF87a" oder "GIF89a"
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return 'image/gif';
  }
  // RIFF-Container (WEBP): "RIFF"...."WEBP"
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return 'image/webp';
  }
  // ISO-BMFF (AVIF): Bytes 4-7 = "ftyp", danach Brand "avif"/"avis"
  if (
    b.length >= 12 &&
    b[4] === 0x66 &&
    b[5] === 0x74 &&
    b[6] === 0x79 &&
    b[7] === 0x70 &&
    b[8] === 0x61 &&
    b[9] === 0x76 &&
    b[10] === 0x69 &&
    (b[11] === 0x66 || b[11] === 0x73)
  ) {
    return 'image/avif';
  }
  return null;
}

export const MAX_ALT_LENGTH = 300;
