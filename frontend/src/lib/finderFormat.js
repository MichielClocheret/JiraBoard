// Ported from legacy/features/finder/finder.js.
const FILE_EXT_ICONS = {
  ai: "🎨", eps: "🎨", psd: "🎨", psb: "🎨", indd: "🎨",
  pdf: "📄", doc: "📄", docx: "📄", xls: "📄", xlsx: "📄",
  jpg: "🖼", jpeg: "🖼", png: "🖼", gif: "🖼", webp: "🖼", svg: "🖼",
  mp4: "🎬", mov: "🎬", avi: "🎬", mkv: "🎬", aep: "🎬", prproj: "🎬",
  mp3: "🎵", wav: "🎵",
  zip: "🗜", rar: "🗜",
};

export function getFileIcon(ext) {
  return FILE_EXT_ICONS[String(ext || "").toLowerCase()] || "📄";
}

export function formatBytes(bytes) {
  if (!+bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KiB", "MiB", "GiB", "TiB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
