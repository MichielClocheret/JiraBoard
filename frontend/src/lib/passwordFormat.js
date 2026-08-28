// Ported from legacy/features/password/password.js.
export function entryTypeName(entryType) {
  return String(entryType || "").trim().toLowerCase() === "licence" ? "Licence" : "Login";
}

export function entryTypeEmoji(entryType) {
  return String(entryType || "").trim().toLowerCase() === "licence" ? "🔑" : "👤";
}
