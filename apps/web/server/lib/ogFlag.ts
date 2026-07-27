import { getCountryCodeForRace } from '../../src/lib/raceCountries';

/**
 * Loads the race's country flag (same-origin static SVG, the assets the Flag
 * component uses) as a data URI for satori. Returns undefined on any failure
 * so the card still renders, just without a flag.
 */
export async function loadFlagDataUri(
  origin: string,
  race: { slug: string },
): Promise<string | undefined> {
  const countryCode = getCountryCodeForRace(race);
  if (!countryCode) {
    return undefined;
  }
  try {
    const res = await fetch(`${origin}/flags/${countryCode}.svg`);
    if (!res.ok) {
      return undefined;
    }
    return toDataUri('image/svg+xml', await res.arrayBuffer());
  } catch {
    return undefined;
  }
}

export async function loadStaticImageDataUri(
  origin: string,
  path: string,
  mimeType: string,
): Promise<string | undefined> {
  try {
    const res = await fetch(new URL(path, origin));
    if (!res.ok) {
      return undefined;
    }
    return toDataUri(mimeType, await res.arrayBuffer());
  } catch {
    return undefined;
  }
}

function toDataUri(mimeType: string, buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Chunked conversion avoids exceeding the argument limit for large assets.
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}
