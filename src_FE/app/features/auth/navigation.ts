/** A login return path must stay internal even after browser URL normalization. */
export function safeReturnPath(value: string | null): string | null {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return null;
  if ([...value].some((character) => character.charCodeAt(0) < 32)) return null;
  return value;
}
