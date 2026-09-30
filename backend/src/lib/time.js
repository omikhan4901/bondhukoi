export const APP_TIME_ZONE = 'Asia/Dhaka';

const hourFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE,
  hour: '2-digit',
  hourCycle: 'h23',
});

/** The hour (0–23) in Bangladesh at `date`, whatever time zone the server runs in. */
export function localHour(date = new Date()) {
  return Number(hourFormat.format(date));
}

/**
 * Whether `date` falls in someone's quiet hours. The window can wrap past midnight
 * (18 → 6 means 6 PM to 6 AM). Start equal to end means no quiet hours.
 */
export function inQuietHours(profile, date = new Date()) {
  if (!profile.quiet_hours_enabled) return false;
  const start = profile.quiet_start;
  const end = profile.quiet_end;
  if (start === end) return false;
  const hour = localHour(date);
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}
