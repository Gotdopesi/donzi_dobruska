import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parse } from "date-fns";
import { cs } from "date-fns/locale";
import { Crown, Loader2, LogOut, Mail, RefreshCw, Save, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SHOWCASE_TABLES } from "@/lib/showcase-tables";
import { useAdminBarbershop } from "@/lib/use-admin-barbershop";
import { useAdminSession } from "@/lib/use-admin-session";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(SHOWCASE_TABLES.zakaznici)
      .select("*")
      .eq("barbershop_id", barbershopId)
      .order("visit_count", { ascending: false });

    setLoading(false);
    if (error) {
      toast.error("Nepodařilo se načíst zákazníky.", { description: error.message });
      return;
    }
    setCustomers((data ?? []) as Customer[]);
  }, [barbershopId]);

  useEffect(() => {
    if (ready && authed) void load();
  }, [ready, authed, load]);

  const topCustomers = useMemo(() => customers.slice(0, 5), [customers]);

  const openCustomer = (c: Customer) => {
    setSelected(c);
    setNoteDraft(c.note ?? "");
    setDetailOpen(true);
  };

  const saveNote = async () => {
    if (!selected) return;
    setSaving(true);
    const note = noteDraft.trim() || null;
    const { error } = await supabase
      .from(SHOWCASE_TABLES.zakaznici)
      .update({ note, updated_at: new Date().toISOString() })
      .eq("id", selected.id);

    setSaving(false);
    if (error) {
      toast.error("Poznámku se nepodařilo uložit.", { description: error.message });
      return;
    }

    const updated = { ...selected, note };
    setSelected(updated);
    setCustomers((prev) => prev.map((c) => (c.id === selected.id ? updated : c)));
    toast.success("Poznámka uložena.");
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
            {shopName ?? "Salón"} — {customers.length} zákazníků
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
          <Card className="border-gold/30">
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
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">Top 5</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {topCustomers.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openCustomer(c)}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:border-gold/50 hover:bg-gold/10 transition-colors"
                >
                  {i + 1}. {c.first_name} ({c.visit_count}×)
                </button>
              ))}
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
            Zatím žádní zákazníci — přidají se z rezervací.
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
                        naposledy{" "}
                        {format(parse(c.last_visit_date, "yyyy-MM-dd", new Date()), "d. M. yyyy")}
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
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {selected.first_name} {selected.last_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <p className="text-muted-foreground">{selected.email}</p>
                <div className="rounded-lg border border-gold/30 bg-gold/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Počet návštěv
                  </p>
                  <p className="font-display text-3xl text-foreground">{selected.visit_count}</p>
                  {selected.first_visit_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      První návštěva:{" "}
                      {format(parse(selected.first_visit_date, "yyyy-MM-dd", new Date()), "d. M. yyyy", {
                        locale: cs,
                      })}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-note">Poznámka</Label>
                  <Textarea
                    id="customer-note"
                    rows={4}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Preference, alergie, styl střihu…"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDetailOpen(false)}>
                  Zavřít
                </Button>
                <Button type="button" onClick={() => void saveNote()} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Ukládám…" : "Uložit poznámku"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
