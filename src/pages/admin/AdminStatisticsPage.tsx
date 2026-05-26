import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  parse,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { cs } from "date-fns/locale";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogOut,
  MessageSquare,
  RefreshCw,
  Scissors,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { REZERVACE_TABLE } from "@/lib/rezervace";
import { SHOWCASE_TABLES } from "@/lib/showcase-tables";
import {
  buildRevenueTimeline,
  displayAmounts,
  maxRevenueMonth,
  minRevenueMonth,
  showPlannedColumn,
} from "@/lib/admin-revenue-display";
import { useAdminBarbershop } from "@/lib/use-admin-barbershop";
import { useAdminSession } from "@/lib/use-admin-session";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminRevenueDetailDialog } from "@/components/admin/AdminRevenueDetailDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/trzby-metrics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/lib/reservations-by-day";

type VydelkyRow = {
  month_key: string;
  earned: number;
  planned: number;
  total: number;
};

type ServiceStatsRow = {
  service_id: number | null;
  service_name: string;
  price: number;
  count_total: number;
  amount_total: number;
};

type CatalogService = {
  id: number;
  name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
};

export default function AdminStatisticsPage() {
  const { ready, authed, signOut } = useAdminSession();
  const { barbershopId, shopName } = useAdminBarbershop();

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [vydelkyRows, setVydelkyRows] = useState<VydelkyRow[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStatsRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailMonth, setDetailMonth] = useState<string | null>(null);

  const monthKey = format(month, "yyyy-MM");
  const monthLabel = format(month, "LLLL yyyy", { locale: cs });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vyd, svc, cat, rez] = await Promise.all([
        supabase
          .from(SHOWCASE_TABLES.vydelky)
          .select("month_key, earned, planned, total")
          .eq("barbershop_id", barbershopId)
          .order("month_key", { ascending: false }),
        supabase
          .from(SHOWCASE_TABLES.vydelkySluzby)
          .select("service_id, service_name, price, count_total, amount_total")
          .eq("barbershop_id", barbershopId)
          .eq("month_key", monthKey)
          .order("count_total", { ascending: false }),
        supabase
          .from(SHOWCASE_TABLES.services)
          .select("id, name, price, duration_minutes, is_active")
          .eq("barbershop_id", barbershopId)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from(REZERVACE_TABLE)
          .select("id, booking_date, booking_time, status, sms_sent, email")
          .eq("barbershop_id", barbershopId),
      ]);

      if (vyd.error) toast.error("Tržby se nepodařilo načíst.", { description: vyd.error.message });
      else
        setVydelkyRows(
          (vyd.data ?? []).map((r) => ({
            month_key: r.month_key,
            earned: Number(r.earned),
            planned: Number(r.planned),
            total: Number(r.total),
          })),
        );

      if (!svc.error) {
        setServiceStats(
          (svc.data ?? []).map((r) => ({
            service_id: r.service_id,
            service_name: r.service_name,
            price: Number(r.price),
            count_total: Number(r.count_total),
            amount_total: Number(r.amount_total),
          })),
        );
      }

      if (!cat.error) {
        setCatalog(
          (cat.data ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            price: Number(s.price),
            duration_minutes: Number(s.duration_minutes),
            is_active: Boolean(s.is_active),
          })),
        );
      }

      if (!rez.error) setReservations((rez.data ?? []) as Reservation[]);
    } finally {
      setLoading(false);
    }
  }, [barbershopId, monthKey]);

  useEffect(() => {
    if (ready && authed) void load();
  }, [ready, authed, load]);

  const current = useMemo(() => {
    const raw = vydelkyRows.find((r) => r.month_key === monthKey) ?? {
      month_key: monthKey,
      earned: 0,
      planned: 0,
      total: 0,
    };
    return displayAmounts(raw);
  }, [vydelkyRows, monthKey]);

  const { past: historyPast, upcoming: historyUpcoming } = useMemo(
    () => buildRevenueTimeline(vydelkyRows),
    [vydelkyRows],
  );

  const monthReservations = useMemo(
    () => reservations.filter((r) => r.booking_date.startsWith(monthKey)),
    [reservations, monthKey],
  );

  const canceledCount = useMemo(
    () => monthReservations.filter((r) => r.status === "canceled").length,
    [monthReservations],
  );

  const smsSentCount = useMemo(
    () => monthReservations.filter((r) => r.sms_sent === true).length,
    [monthReservations],
  );

  const weekDays = useMemo(() => {
    const end = endOfWeek(weekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end });
  }, [weekStart]);

  const weekPerformance = useMemo(() => {
    return weekDays.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const count = reservations.filter(
        (r) => r.booking_date === key && r.status !== "canceled",
      ).length;
      return {
        key,
        label: format(d, "EEE d. M.", { locale: cs }),
        count,
      };
    });
  }, [weekDays, reservations]);

  const maxWeekCount = Math.max(...weekPerformance.map((w) => w.count), 1);
  const canGoPrev = !isBefore(startOfMonth(month), minRevenueMonth());
  const canGoNext = !isAfter(startOfMonth(month), maxRevenueMonth());

  if (!ready || !authed) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
        <p className="text-sm">Ověřuji přístup…</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <p className="text-gold tracking-[0.25em] text-xs uppercase mb-2">Administrace</p>
          <h1 className="font-display text-4xl md:text-5xl flex items-center gap-3">
            <BarChart3 className="h-9 w-9 text-gold shrink-0" />
            Statistiky
          </h1>
          <div className="hairline w-20 mt-4 mb-2" />
          <p className="text-muted-foreground text-sm">{shopName ?? "Salón"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Obnovit
          </Button>
          <Button variant="outline" onClick={() => void signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Odhlásit se
          </Button>
        </div>
      </div>

      <AdminNav />

      <div className="flex items-center justify-center gap-4 mb-6">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!canGoPrev}
          onClick={() => setMonth((m) => addMonths(m, -1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-display text-xl capitalize min-w-[180px] text-center">{monthLabel}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!canGoNext}
          onClick={() => setMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <section className="mb-10">
        <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-gold" />
          Tržby
        </h2>
        <div className={cn("grid gap-4 mb-6", showPlannedColumn(monthKey) ? "md:grid-cols-3" : "md:grid-cols-2")}>
          <Card className="border-gold/30 bg-gradient-to-br from-gold/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">Už vyděláno</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl">{formatCurrency(current.earned)}</p>
            </CardContent>
          </Card>
          {showPlannedColumn(monthKey) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">V plánu</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl">{formatCurrency(current.planned)}</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">Celkem</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl">{formatCurrency(current.total)}</p>
            </CardContent>
          </Card>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setDetailMonth(monthKey)}>
          Detail měsíce — služby
        </Button>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl mb-4">Výkonost týdne</h2>
        <div className="flex items-center gap-4 mb-4">
          <Button type="button" variant="outline" size="icon" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm capitalize text-muted-foreground">
            {format(weekDays[0], "d. M.", { locale: cs })} – {format(weekDays[6], "d. M. yyyy", { locale: cs })}
          </span>
          <Button type="button" variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-7">
          {weekPerformance.map((w) => (
            <Card key={w.key} className="border-border/60">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs font-normal capitalize text-muted-foreground">{w.label}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="font-display text-2xl">{w.count}</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full bg-gold/70 rounded-full"
                    style={{ width: `${Math.max(8, (w.count / maxWeekCount) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">zákazníků</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 mb-10">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Zrušené rezervace
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl">{canceledCount}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">za {monthLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Odeslané SMS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl">{smsSentCount}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">za {monthLabel}</p>
          </CardContent>
        </Card>
      </div>

      <section id="sluzby" className="mb-10">
        <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
          <Scissors className="h-6 w-6 text-gold" />
          Služby
        </h2>
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden mb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Služba</TableHead>
                <TableHead className="text-right">Cena</TableHead>
                <TableHead className="text-right">Délka</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalog.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">{s.price.toLocaleString("cs-CZ")} Kč</TableCell>
                  <TableCell className="text-right">{s.duration_minutes} min</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {serviceStats.length > 0 && (
          <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
            <div className="px-5 py-3 border-b border-border/60">
              <p className="text-sm text-muted-foreground capitalize">Objednávky služeb — {monthLabel}</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Služba</TableHead>
                  <TableHead className="text-right">Počet</TableHead>
                  <TableHead className="text-right">Tržby</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceStats.map((r) => (
                  <TableRow key={`${r.service_id}-${r.service_name}`}>
                    <TableCell>{r.service_name}</TableCell>
                    <TableCell className="text-right">{r.count_total}×</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(r.amount_total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {(historyUpcoming.length > 0 || historyPast.length > 0) && (
        <section className="rounded-xl border border-border bg-card/50 p-6 space-y-8">
          {historyUpcoming.length > 0 && (
            <div>
              <h3 className="font-display text-xl mb-4">Nadcházející měsíce</h3>
              <div className="space-y-3">
                {historyUpcoming.map((h) => (
                  <div key={h.key} className="flex items-center gap-4 text-sm">
                    <span className="w-36 capitalize text-muted-foreground">{h.label}</span>
                    <span className="font-medium">{formatCurrency(h.planned)}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setDetailMonth(h.key)}>
                      Detail
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {historyPast.length > 0 && (
            <div>
              <h3 className="font-display text-xl mb-4">Minulé měsíce</h3>
              <div className="space-y-3">
                {historyPast.map((h) => (
                  <div key={h.key} className="flex items-center gap-4 text-sm">
                    <span className="w-36 capitalize text-muted-foreground">{h.label}</span>
                    <span className="font-medium">{formatCurrency(h.earned)}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setDetailMonth(h.key)}>
                      Detail
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {detailMonth && (
        <AdminRevenueDetailDialog
          open={Boolean(detailMonth)}
          onOpenChange={(o) => !o && setDetailMonth(null)}
          barbershopId={barbershopId}
          monthKey={detailMonth}
        />
      )}
    </>
  );
}
