import { describe, expect, it } from 'bun:test';
import { addWorkdays, buildSchedulePreview, parseScheduleDay, type GeneratedScheduleTask } from './planSchedule';

const task = (patch: Partial<GeneratedScheduleTask>): GeneratedScheduleTask => ({
  id: 't1', title: 'Task', durationDays: 1, startOffsetDays: 0, dependsOn: [], phase: 'General', source: 'Plans', ...patch,
});

describe('plan-based schedule dates', () => {
  it('uses the chosen start date and weekday durations', () => {
    const [result] = buildSchedulePreview([task({ durationDays: 3 })], '2026-11-20');
    expect(result.startDate).toBe('2026-11-20');
    expect(result.endDate).toBe('2026-11-24');
  });

  it('starts dependent work on the next workday after its predecessor', () => {
    const result = buildSchedulePreview([
      task({ id: 't1', title: 'Foundations', durationDays: 2 }),
      task({ id: 't2', title: 'Framing', durationDays: 2, dependsOn: ['t1'] }),
    ], '2026-11-20');
    expect(result[1].startDate).toBe('2026-11-24');
    expect(result[1].endDate).toBe('2026-11-25');
  });

  it('allows independent work to use its own later offset', () => {
    const result = buildSchedulePreview([
      task({ id: 't1', title: 'Mobilization' }),
      task({ id: 't2', title: 'Delivery', startOffsetDays: 5 }),
    ], '2026-11-20');
    expect(result[1].startDate).toBe('2026-11-27');
  });

  it('moves a weekend start to Monday', () => {
    expect(addWorkdays(parseScheduleDay('2026-11-21'), 0)).toEqual(parseScheduleDay('2026-11-23'));
  });
});
