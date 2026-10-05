export interface ParsedChatLine {
  sender: string;
  body: string;
  timestamp: string;
}

/**
 * Parses common Android/iOS WhatsApp text-export lines.
 * Media attachments and WhatsApp system notices remain plain text and can be reviewed before import.
 */
export function parseWhatsAppExport(transcript: string): ParsedChatLine[] {
  const lines = transcript.replace(/^\uFEFF/, "").split(/\r?\n/);
  const messages: ParsedChatLine[] = [];
  let current: ParsedChatLine | undefined;

  const bracketed = /^\[(\d{1,2}[/.]\d{1,2}[/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)\]\s*([^:]+):\s*(.*)$/i;
  const plain = /^(\d{1,2}[/.]\d{1,2}[/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)\s+-\s+([^:]+):\s*(.*)$/i;

  for (const line of lines) {
    const match = line.match(bracketed) ?? line.match(plain);
    if (match?.[1] && match[2] && match[3] !== undefined && match[4] !== undefined) {
      current = {
        timestamp: parseExportDate(match[1], match[2]),
        sender: match[3].trim(),
        body: match[4].trim(),
      };
      messages.push(current);
    } else if (current && line.trim()) {
      current.body += `\n${line.trim()}`;
    }
  }

  return messages.slice(-1000);
}

function parseExportDate(datePart: string, timePart: string): string {
  const [first, second, rawYear] = datePart.split(/[/.]/).map(Number);
  if (!first || !second || !rawYear) return new Date().toISOString();
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  let [rawHour = 0, minute = 0, secondValue = 0] = timePart
    .replace(/\s*(am|pm)\s*/i, "")
    .split(":")
    .map(Number);
  if (/pm/i.test(timePart) && rawHour < 12) rawHour += 12;
  if (/am/i.test(timePart) && rawHour === 12) rawHour = 0;

  // WhatsApp exports are locale-dependent. Day-first is the safest default outside the US.
  const day = first > 12 ? first : second > 12 ? second : first;
  const month = first > 12 ? second : second > 12 ? first : second;
  const parsed = new Date(year, month - 1, day, rawHour, minute, secondValue);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}
