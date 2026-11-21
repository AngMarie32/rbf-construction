export function normalizeSchedule(parsed: any) {
  const rawTasks = Array.isArray(parsed?.tasks) ? parsed.tasks.slice(0, 50) : [];
  const idMap = new Map<string, string>();
  rawTasks.forEach((task: any, index: number) => idMap.set(String(task.id || `t${index + 1}`), `t${index + 1}`));
  const tasks = rawTasks.map((task: any, index: number) => {
    const id = `t${index + 1}`;
    const earlier = new Set(Array.from({ length: index }, (_, i) => `t${i + 1}`));
    return {
      id,
      title: String(task.title || `Activity ${index + 1}`).slice(0, 180),
      phase: String(task.phase || "Construction").slice(0, 80),
      durationDays: Math.min(120, Math.max(1, Math.round(Number(task.duration_days) || 1))),
      startOffsetDays: Math.min(1000, Math.max(0, Math.round(Number(task.start_offset_days) || 0))),
      dependsOn: (Array.isArray(task.depends_on) ? task.depends_on : [])
        .map((dep: any) => idMap.get(String(dep)))
        .filter((dep: any): dep is string => !!dep && earlier.has(dep)),
      source: String(task.source || "Professional scheduling assumption").slice(0, 240),
    };
  }).filter((task: any) => task.title.trim());
  if (!tasks.length) throw new Error("No schedule activities could be produced from those documents.");
  return {
    detectedStartDate: /^\d{4}-\d{2}-\d{2}$/.test(parsed?.detected_start_date || "") ? parsed.detected_start_date : null,
    assumptions: (Array.isArray(parsed?.assumptions) ? parsed.assumptions : []).slice(0, 12).map(String),
    tasks,
  };
}
