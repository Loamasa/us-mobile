import type { SpotSchedule, UserSpot } from '@/types';

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** JS getDay() (Sun=0) → ISO weekday (Mon=1 … Sun=7). */
export function isoWeekday(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Whether `now` falls inside the schedule's weekly window. No schedule (or an
 * empty day list) means "always". An end before the start spans midnight —
 * e.g. Fri 22:00–02:00 covers Friday night into early Saturday.
 */
export function isWithinSchedule(
  schedule: SpotSchedule | null | undefined,
  now: Date = new Date()
): boolean {
  if (!schedule || schedule.days.length === 0) return true;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(schedule.start);
  const end = toMinutes(schedule.end);
  const day = isoWeekday(now);

  if (start === end) return schedule.days.includes(day); // degenerate: all day
  if (start < end) {
    return schedule.days.includes(day) && minutes >= start && minutes < end;
  }
  // Overnight: after `start` counts on the listed day; before `end` counts as
  // the spill-over from the previous listed day.
  const prevDay = day === 1 ? 7 : day - 1;
  return (
    (schedule.days.includes(day) && minutes >= start) ||
    (schedule.days.includes(prevDay) && minutes < end)
  );
}

/** The single source of truth for "does this spot count right now". */
export function isSpotActiveNow(spot: UserSpot, now: Date = new Date()): boolean {
  return spot.isActive && isWithinSchedule(spot.schedule, now);
}

/** Compact summary for list rows, e.g. "Mon–Fri · 08:00–17:00". */
export function formatSchedule(schedule: SpotSchedule): string {
  const days = [...schedule.days].sort((a, b) => a - b);
  let dayPart: string;
  if (days.length === 7) {
    dayPart = 'Every day';
  } else {
    // Compress consecutive runs: [1,2,3,4,5] → "Mon–Fri".
    const parts: string[] = [];
    let runStart = days[0];
    let prev = days[0];
    for (const d of days.slice(1).concat(NaN)) {
      if (d === prev + 1) {
        prev = d;
        continue;
      }
      parts.push(
        runStart === prev
          ? DAY_LABELS[runStart - 1]
          : `${DAY_LABELS[runStart - 1]}–${DAY_LABELS[prev - 1]}`
      );
      runStart = d;
      prev = d;
    }
    dayPart = parts.join(', ');
  }
  return `${dayPart} · ${schedule.start}–${schedule.end}`;
}
