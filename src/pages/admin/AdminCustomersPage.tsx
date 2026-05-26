import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parse } from "date-fns";
import { cs } from "date-fns/locale";
import { Crown, Loader2, LogOut, Mail, RefreshCw, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { REZERVACE_TABLE } from "@/lib/rezervace";
import { SHOWCASE_TABLES } from "@/lib/showcase-tables";
import { useAdminBarbershop } from "@/lib/use-admin-barbershop";
import { useAdminSession } from "@/lib/use-admin-session";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Reservation } from "@/lib/reservations-by-day";
import { customerLabel } from "@/lib/reservations-by-day";

type Customer = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  note: string | null;
  visit_count: number;
  first_visit_date: string | null;
  last_visit_date: string | null;
};

export default function AdminCustomersPage() {
  const { ready, authed, signOut } = useAdminSession();
  const { barbershopId, shopName } = useAdminBarbershop();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes, rezRes] = await Promise.all([
        supabase
          .from(SHOWCASE_TABLES.zakaznici)
          .select("*")
          .eq("barbershop_id", barbershopId)
          .order("visit_count", { ascending: false }),
        supabase
          .from(REZERVACE_TABLE)
          .select("*")
          .eq("barbershop_id", barbershopId)
          .order("booking_date", { ascending: false }),
      ]);

      if (custRes.error) {
        toast.error("Nepodařilo se načíst zákazníky.", { description: custRes.error.message });
        return;
      }
      if (rezRes.error) {
        toast.error("Nepodařilo se načíst historii.", { description: rezRes.error.message });
        return;
      }

      setCustomers((custRes.data ?? []) as Customer[]);
      setReservations((rezRes.data ?? []) as Reservation[]);
    } finally {
      setLoading(false);
    }
  }, [barbershopId]);

  useEffect(() => {
    if (ready && authed) void load();
  }, [ready, authed, load]);

  const topCustomers = useMemo(() => customers.slice(0, 5), [customers]);

  const historyByMonth = useMemo(() => {
    if (!selected) return [];
    const email = selected.email.toLowerCase();
    const rows = reservations.filter(
      (r) => r.email?.toLowerCase() === email && r.status !== "canceled",
    );
    const map = new Map<string, Reservation[]>();
    for (const r of rows) {
      const mk = r.booking_date.slice(0, 7);
      const list = map.get(mk) ?? [];
      list.push(r);
      map.set(mk, list);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([monthKey, items]) => ({
        monthKey,
        label: format(parse(`${monthKey}-01`, "yyyy-MM-dd", new Date()), "LLLL yyyy", {
          locale: cs,
        }),
        items: items.sort((a, b) => b.booking_date.localeCompare(a.booking_date)),
      }));
  }, [selected, reservations]);

  const openCustomer = (c: Customer) => {
    setSelected(c);
    setDetailOpen(true);
  };

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
          <h1 className="font-display text-4xl md:text-5xl">Zákazníci</h1>
          <div className="hairline w-20 mt-4 mb-2" />
          <p className="text-muted-foreground text-sm">
            {shopName ?? "Salón"} — {customers.length} zákazníků v evidenci
          </p>
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

      {topCustomers.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="md:col-span-1 border-gold/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                <Crown className="h-4 w-4 text-gold" />
                Nejvěrnější zákazník
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-xl">
                {topCustomers[0].first_name} {topCustomers[0].last_name}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {topCustomers[0].visit_count} návštěv
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
        {loading && customers.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-gold" />
          </div>
        ) : customers.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground text-sm">
            Zatím žádní zákazníci — přidají se automaticky z rezervací.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {customers.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openCustomer(c)}
                  className="w-full flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-gold" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {c.first_name} {c.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        {c.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{c.visit_count}× návštěva</p>
                    {c.last_visit_date && (
                      <p className="text-xs text-muted-foreground">
                        naposledy {format(parse(c.last_visit_date, "yyyy-MM-dd", new Date()), "d. M. yyyy")}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {selected.first_name} {selected.last_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <p className="text-muted-foreground">{selected.email}</p>
                {selected.note && (
                  <p className="rounded-md bg-muted/50 px-3 py-2 border border-border/60">
                    <span className="text-muted-foreground">Poznámka: </span>
                    {selected.note}
                  </p>
                )}
                <p>
                  Celkem <strong>{selected.visit_count}</strong> návštěv
                </p>
                <h3 className="font-display text-lg pt-2 border-t border-border/60">
                  Historie po měsících
                </h3>
                {historyByMonth.length === 0 ? (
                  <p className="text-muted-foreground">Žádné rezervace.</p>
                ) : (
                  <div className="space-y-4">
                    {historyByMonth.map((m) => (
                      <div key={m.monthKey}>
                        <p className="text-xs uppercase tracking-wider text-gold mb-2 capitalize">
                          {m.label}
                        </p>
                        <ul className="space-y-2">
                          {m.items.map((r) => (
                            <li
                              key={r.id}
                              className="flex justify-between gap-2 rounded-md border border-border/50 px-3 py-2"
                            >
                              <span className="truncate">{r.service}</span>
                              <span className="text-muted-foreground shrink-0">
                                {format(parse(r.booking_date, "yyyy-MM-dd", new Date()), "d. M.")}{" "}
                                {r.booking_time}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
