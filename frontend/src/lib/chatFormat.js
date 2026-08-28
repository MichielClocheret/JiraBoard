// Ported from legacy/features/chat/chat.js.

export function resolveDisplayName(nameOrId, availableUsers) {
  if (!nameOrId) return "Anonymous";
  const found = (availableUsers || []).find((u) => u.accountId === nameOrId);
  return found?.displayName || nameOrId;
}

export function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return (
    date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " +
    date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

const OFM_PREFIX = "__OFM1__";

export function parsePayload(rawMessage) {
  const raw = String(rawMessage || "");
  if (!raw.startsWith(OFM_PREFIX)) return { text: raw, files: [] };
  try {
    const parsed = JSON.parse(raw.slice(OFM_PREFIX.length));
    return {
      text: typeof parsed?.text === "string" ? parsed.text : "",
      files: Array.isArray(parsed?.files)
        ? parsed.files
            .map((f) => ({
              name: String(f?.name || ""),
              path: String(f?.path || ""),
              ext: String(f?.ext || ""),
              size: Number(f?.size || 0) || 0,
            }))
            .filter((f) => f.path !== "")
        : [],
    };
  } catch {
    return { text: raw, files: [] };
  }
}

export function summarize(rawMessage) {
  if (String(rawMessage || "").startsWith(OFM_PREFIX)) {
    const p = parsePayload(rawMessage);
    if (p.text.trim()) return p.text;
    if (p.files.length) return "Attached " + p.files.length + " file" + (p.files.length === 1 ? "" : "s");
    return "";
  }
  return String(rawMessage || "");
}

export function buildOutgoingMessage(text, pendingFiles) {
  const trimmed = String(text || "").trim();
  if (!pendingFiles.length) return trimmed;
  return (
    OFM_PREFIX +
    JSON.stringify({
      text: trimmed,
      files: pendingFiles.map((file) => ({
        name: String(file?.name || file?.path || "File"),
        path: String(file?.path || ""),
        ext: String(file?.ext || ""),
        size: Number(file?.size || 0) || 0,
      })),
    })
  );
}

// Splits `text` into plain-text / @mention segments for rendering, so
// `@DisplayName` is only highlighted when it matches a real user and is
// followed by a word boundary — ported from chatAppendMentionText().
export function splitMentions(text, mentionUsers) {
  const str = String(text || "");
  if (!str || !str.includes("@") || !mentionUsers.length) {
    return [{ type: "text", value: str }];
  }

  const byLen = mentionUsers
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((name) => ({ name, lower: name.toLowerCase(), len: name.length }));

  const segments = [];
  let cursor = 0;
  while (cursor < str.length) {
    const atIdx = str.indexOf("@", cursor);
    if (atIdx === -1) {
      segments.push({ type: "text", value: str.slice(cursor) });
      break;
    }
    if (atIdx > cursor) segments.push({ type: "text", value: str.slice(cursor, atIdx) });

    let matched = null;
    for (const cand of byLen) {
      const slice = str.substr(atIdx + 1, cand.len);
      if (slice.toLowerCase() !== cand.lower) continue;
      const after = str.charAt(atIdx + 1 + cand.len);
      if (after && !/[\s.,!?;:()[\]]/.test(after)) continue;
      matched = cand;
      break;
    }

    if (!matched) {
      segments.push({ type: "text", value: "@" });
      cursor = atIdx + 1;
      continue;
    }

    segments.push({ type: "mention", value: "@" + matched.name });
    cursor = atIdx + 1 + matched.len;
  }
  return segments;
}
