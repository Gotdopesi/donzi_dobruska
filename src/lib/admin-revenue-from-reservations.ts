import { addMonths, format, startOfMonth, startOfYear, subMonths } from "date-fns";
import { cs } from "date-fns/locale";
import {
  periodAnchorStart,
  reservationsInScope,
  type StatsPeriod,
} from "@/lib/admin-statistics-period";
import {
  isEarned,
  isPlanned,
  resolvePrice,
  type ReservationRow,
} from "@/lib/reservation-metrics";
import type { RevenueChartPoint } from "@/lib/admin-statistics-period";

export type RevenueTotals = {
  earned: number;
  planned: number;
  total: number;
};

export function aggregateRevenueFromReservations(
  reservations: ReservationRow[],
  period: StatsPeriod,
  anchor: Date,
  now = new Date(),
): RevenueTotals {
  const inScope = reservationsInScope(
    reservations as Parameters<typeof reservationsInScope>[0],
    period,
    anchor,
  );

  const earned = inScope
    .filter((r) => isEarned(r, now))
    .reduce((s, r) => s + resolvePrice(r), 0);

  const planned = inScope
    .filter((r) => isPlanned(r, now))
    .reduce((s, r) => s + resolvePrice(r), 0);

  return { earned, planned, total: earned + planned };
}

export function countCanceledInScope(
  reservations: { booking_date: string; status: string }[],
  period: StatsPeriod,
  anchor: Date,
): number {
  return reservationsInScope(
    reservations as Parameters<typeof reservationsInScope>[0],
    period,
    anchor,
  ).filter((r) => r.status === "canceled").length;
}

export function buildRevenueChartFromReservations(
  reservations: ReservationRow[],
  period: StatsPeriod,
  anchor: Date,
  now = new Date(),
): RevenueChartPoint[] {
  if (period === "year") {
    const start = startOfYear(periodAnchorStart(period, anchor));
    return Array.from({ length: 12 }, (_, i) => {
      const m = addMonths(start, i);
      const key = format(m, "yyyy-MM");
      const monthRows = reservations.filter((r) => r.booking_date.startsWith(key));
      const earned = monthRows
        .filter((r) => isEarned(r, now))
        .reduce((s, r) => s + resolvePrice(r), 0);
      const planned = monthRows
        .filter((r) => isPlanned(r, now))
        .reduce((s, r) => s + resolvePrice(r), 0);
      return {
        label: format(m, "LLL", { locale: cs }),
        earned,
        planned,
      };
    });
  }

  if (period === "month") {
    const start = startOfMonth(periodAnchorStart(period, anchor));
    return Array.from({ length: 12 }, (_, i) => {
      const m = subMonths(start, 11 - i);
      const key = format(m, "yyyy-MM");
      const monthRows = reservations.filter((r) => r.booking_date.startsWith(key));
      const earned = monthRows
        .filter((r) => isEarned(r, now))
        .reduce((s, r) => s + resolvePrice(r), 0);
      const planned = monthRows
        .filter((r) => isPlanned(r, now))
        .reduce((s, r) => s + resolvePrice(r), 0);
      return {
        label: format(m, "LLL yy", { locale: cs }),
        earned,
        planned,
      };
    });
  }

  return [];
}

/** Sloučí agregaci z DB (vydelky) a z rezervací — bere vyšší hodnoty po polích. */
export function mergeRevenueTotals(
  fromDb: RevenueTotals,
  fromReservations: RevenueTotals,
): RevenueTotals {
  return {
    earned: Math.max(fromDb.earned, fromReservations.earned),
    planned: Math.max(fromDb.planned, fromReservations.planned),
    total: Math.max(fromDb.total, fromReservations.total),
  };
}
