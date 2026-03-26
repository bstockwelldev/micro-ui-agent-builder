/** Parse a multiline textarea into non-empty optional element strings for `AgentProfile`. */
export function optionalElementsFromMultiline(text: string): string[] | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines : undefined;
}
