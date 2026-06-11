export type RedactStringOptions = Readonly<{
  visibleStart?: number;
  visibleEnd?: number;
  maskCharacter?: string;
}>;

const HTML_ESCAPE_MAP: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPE_MAP[character] ?? character);
}

/**
 * Removes non-printing control characters from plain text.
 * This is not an HTML sanitizer and must not be used to make HTML injection safe.
 */
export function sanitizeText(value: string): string {
  return Array.from(value)
    .filter((character) => {
      const codePoint = character.codePointAt(0);
      if (codePoint === undefined) {
        return false;
      }

      const isAllowedWhitespace = codePoint === 9 || codePoint === 10 || codePoint === 13;
      const isControlCharacter =
        (codePoint >= 0 && codePoint <= 31) || (codePoint >= 127 && codePoint <= 159);

      return isAllowedWhitespace || !isControlCharacter;
    })
    .join("");
}

export function createNoopenerRel(rel?: string): string {
  const tokens = new Set(
    rel
      ?.split(/\s+/)
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean) ?? [],
  );

  tokens.add("noopener");

  return Array.from(tokens).join(" ");
}

export function redactString(value: string, options: RedactStringOptions = {}): string {
  const visibleStart = Math.max(0, Math.floor(options.visibleStart ?? 0));
  const visibleEnd = Math.max(0, Math.floor(options.visibleEnd ?? 0));
  const hiddenLength = Math.max(0, value.length - visibleStart - visibleEnd);

  if (hiddenLength === 0) {
    return value;
  }

  const maskCharacter = options.maskCharacter || "*";
  const prefix = value.slice(0, visibleStart);
  const suffix = visibleEnd === 0 ? "" : value.slice(-visibleEnd);

  return `${prefix}${maskCharacter.repeat(hiddenLength)}${suffix}`;
}
