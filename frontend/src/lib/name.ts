export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "-" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

export function getDisplayInitial(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (!cleaned) return "U";
  const words = cleaned.split(" ");
  const honorifics = new Set(["dr", "dr.", "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "prof", "prof."]);
  for (const w of words) {
    const lower = w.toLowerCase();
    if (honorifics.has(lower)) continue;
    const letter = w.match(/[a-zA-Z]/)?.[0];
    if (letter) return letter.toUpperCase();
  }
  const fallback = cleaned.match(/[a-zA-Z]/)?.[0];
  return fallback ? fallback.toUpperCase() : "U";
}
