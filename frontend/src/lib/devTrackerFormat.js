// Ported from legacy/features/veaudev/veaudev.js.

export function normalizeBuildType(v) {
  return String(v || "").trim().toLowerCase();
}

// Returns { icon, label, isOther } for a project's raw buildType string —
// Webflow/Custom get their known icon, anything else falls back to the
// generic "Other" icon with the raw text as the label.
export function buildTypeBadge(buildType) {
  const t = normalizeBuildType(buildType);
  const raw = String(buildType || "").trim();
  if (!raw) return null;
  if (t === "webflow") return { icon: "/assets/images/WebflowIcon.png", label: "Webflow", isOther: false };
  if (t === "custom") return { icon: "/assets/images/VscodeIcon.png", label: "Custom", isOther: false };
  return { icon: "/assets/images/OtherIcon.png", label: raw, isOther: true };
}

export function maskPassword(value) {
  return "•".repeat(String(value || "").length);
}

export function loginChoiceLabel(deployMode, webhostingMode) {
  if (deployMode !== "webhosting") return "";
  if (["customLogin", "otherLogin", "other"].includes(webhostingMode)) return "Custom login";
  if (webhostingMode === "personal") return "Personal";
  return "Arno login";
}

function projectTimestamp(project) {
  const raw = String(project?.createdAt || "").trim();
  const ts = raw ? Date.parse(raw.replace(" ", "T")) : NaN;
  return Number.isNaN(ts) ? Number(project?.id || 0) : ts;
}

export function sortProjectsByDate(projects, order) {
  const items = Array.isArray(projects) ? [...projects] : [];
  const dir = order === "oldest" ? 1 : -1;
  return items.sort((a, b) => {
    const diff = projectTimestamp(a) - projectTimestamp(b);
    if (diff !== 0) return diff * dir;
    return (Number(a?.id || 0) - Number(b?.id || 0)) * dir;
  });
}

export function matchesProjectTypeFilter(project, typeFilter) {
  const buildType = normalizeBuildType(project?.buildType);
  if (typeFilter === "all") return true;
  if (typeFilter === "webflow") return buildType === "webflow";
  if (typeFilter === "custom") return buildType === "custom";
  if (typeFilter === "other") return buildType !== "" && buildType !== "webflow" && buildType !== "custom";
  return true;
}
