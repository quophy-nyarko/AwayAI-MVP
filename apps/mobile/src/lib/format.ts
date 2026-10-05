export function relativeTime(value: string): string {
  const milliseconds = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(milliseconds / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function firstName(value: string): string {
  return value.trim().split(/\s+/)[0] || "there";
}
