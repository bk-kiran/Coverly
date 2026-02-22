import ICAL from "ical.js";
import { format } from "date-fns";

export interface ParsedCalendarEvent {
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isOOO: boolean;
}

const OOO_KEYWORDS = [
  "out of office",
  "ooo",
  "vacation",
  "holiday",
  "leave",
  "pto",
  "day off",
  "off",
];

export function parseICSFile(icsContent: string): ParsedCalendarEvent[] {
  const jcal = ICAL.parse(icsContent);
  const comp = new ICAL.Component(jcal);
  const vevents = comp.getAllSubcomponents("vevent");

  const events: ParsedCalendarEvent[] = [];

  const maxDate = ICAL.Time.fromJSDate(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    const title = event.summary ?? "(No title)";
    const titleLower = title.toLowerCase();
    const isOOO = OOO_KEYWORDS.some((kw) => titleLower.includes(kw));

    const rrule = vevent.getFirstProperty("rrule");
    if (rrule) {
      const expand = new ICAL.RecurExpansion({
        component: vevent,
        dtstart: event.startDate,
      });

      let next = expand.next();
      while (next && next.compare(maxDate) < 0) {
        const jsDate = next.toJSDate();
        events.push({
          title,
          startDate: format(jsDate, "yyyy-MM-dd"),
          endDate: format(jsDate, "yyyy-MM-dd"),
          isOOO,
        });
        next = expand.next();
      }
    } else {
      const start = event.startDate.toJSDate();
      const end = event.endDate.toJSDate();
      events.push({
        title,
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
        isOOO,
      });
    }
  }

  return events;
}
