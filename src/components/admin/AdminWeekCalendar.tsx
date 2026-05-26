import { useMemo, useState } from "react";
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { cs } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/lib/reservations-by-day";
import { customerLabel } from "@/lib/reservations-by-day";
import { getTimeSlotsForWeek, timeToMinutes } from "@/lib/booking-slots";
import { getOpeningHoursForDay } from "@/lib/opening-hours";

const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

type Props = {
  rows: Reservation[];
  loading?: boolean;
};

function activeReservations(rows: Reservation[]) {
  return rows.filter((r) => r.status !== "canceled");
}

export function AdminWeekCalendar({ rows, loading }: Props) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const weekDays = useMemo(() => {
    const end = endOfWeek(weekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end });
  }, [weekStart]);

  const timeSlots = useMemo(() => getTimeSlotsForWeek(weekDays), [weekDays]);

  const byDate = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of activeReservations(rows)) {
      const list = map.get(r.booking_date) ?? [];
      list.push(r);
      map.set(r.booking_date, list);
    }
    return map;
  }, [rows]);

  const weekLabel = `${format(weekDays[0], "d. M.", { locale: cs })} – ${format(weekDays[6], "d. M. yyyy", { locale: cs })}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button type="button" variant="outline" size="icon" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-display text-xl capitalize">{weekLabel}</span>
        <Button type="button" variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12 text-sm">Načítám…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr className="bg-muted/40">
                <th className="p-2 w-14 text-left text-muted-foreground font-medium border-b border-border/60">
                  Čas
                </th>
                {weekDays.map((d, i) => {
                  const hours = getOpeningHoursForDay(d);
                  return (
                    <th
                      key={d.toISOString()}
                      className={cn(
                        "p-2 border-b border-border/60 text-center min-w-[88px]",
                        isSameDay(d, new Date()) && "bg-gold/10",
                        !hours && "opacity-40",
                      )}
                    >
                      <div className="font-medium">{WEEKDAYS[i]}</div>
                      <div className="text-muted-foreground">{format(d, "d. M.", { locale: cs })}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => (
                <tr key={slot} className="border-b border-border/40 last:border-0">
                  <td className="p-1.5 text-muted-foreground align-top whitespace-nowrap">{slot}</td>
                  {weekDays.map((d) => {
                    const key = format(d, "yyyy-MM-dd");
                    const hours = getOpeningHoursForDay(d);
                    const slotMin = timeToMinutes(slot);
                    const dayRows = byDate.get(key) ?? [];
                    const inSlot = dayRows.filter((r) => {
                      const start = timeToMinutes(r.booking_time);
                      const dur = Number(r.duration_minutes) || 60;
                      return start <= slotMin && start + dur > slotMin;
                    });

                    if (!hours || slotMin < hours.open || slotMin >= hours.close) {
                      return (
                        <td key={key + slot} className="p-0.5 bg-muted/20 align-top h-10" />
                      );
                    }

                    return (
                      <td key={key + slot} className="p-0.5 align-top h-10">
                        {inSlot.map((r) => (
                          <div
                            key={r.id}
                            className="rounded px-1 py-0.5 bg-gold/25 border border-gold/40 text-[10px] leading-tight truncate"
                            title={`${customerLabel(r)} — ${r.service}`}
                          >
                            <span className="font-medium">{r.booking_time}</span>{" "}
                            {customerLabel(r).split(" ")[0]}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
