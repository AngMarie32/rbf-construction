import { assertEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { normalizeSchedule } from "./schedule.ts";

Deno.test("normalizes schedule activities and keeps only earlier predecessors", () => {
  const result = normalizeSchedule({
    detected_start_date: "2027-01-15",
    assumptions: ["Five-day workweek"],
    tasks: [
      { id: "site", title: "Site work", phase: "Site", duration_days: 4, start_offset_days: 0, depends_on: [], source: "C1" },
      { id: "frame", title: "Framing", phase: "Structure", duration_days: 6, start_offset_days: 0, depends_on: ["site", "later"], source: "A301" },
      { id: "later", title: "Closeout", duration_days: 1, depends_on: [], source: "Assumption" },
    ],
  });
  assertEquals(result.detectedStartDate, "2027-01-15");
  assertEquals(result.tasks[1].id, "t2");
  assertEquals(result.tasks[1].dependsOn, ["t1"]);
  assertEquals(result.tasks[1].durationDays, 6);
});

Deno.test("limits durations and rejects empty schedules", () => {
  const result = normalizeSchedule({ tasks: [{ title: "Mobilize", duration_days: 500, start_offset_days: -4 }] });
  assertEquals(result.tasks[0].durationDays, 120);
  assertEquals(result.tasks[0].startOffsetDays, 0);
  assertThrows(() => normalizeSchedule({ tasks: [] }));
});
