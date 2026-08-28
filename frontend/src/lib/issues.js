// Shared issue helpers — ported from legacy/js/userDashboard.js.

export function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T00:00:00") < today;
}

export function sortIssues(issues) {
  const byDate = (a, b) => {
    if (!a.duedate && !b.duedate) return 0;
    if (!a.duedate) return 1;
    if (!b.duedate) return -1;
    return a.duedate < b.duedate ? -1 : a.duedate > b.duedate ? 1 : 0;
  };
  const overdue = issues.filter((i) => isOverdue(i.duedate)).sort(byDate);
  const other = issues.filter((i) => !isOverdue(i.duedate)).sort(byDate);
  return [...overdue, ...other];
}

export function groupByProject(items) {
  const map = new Map();
  for (const it of items || []) {
    const pKey = it.projectKey || "UNKNOWN";
    if (!map.has(pKey)) {
      map.set(pKey, { projectKey: pKey, projectName: it.projectName || pKey, items: [] });
    }
    map.get(pKey).items.push(it);
  }
  return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
}
