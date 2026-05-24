import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type BarbershopRow } from "@/lib/barbershop";
import { SHOWCASE_TABLES } from "@/lib/showcase-tables";
import { useAdminBarbershop } from "@/lib/use-admin-barbershop";
import { cn } from "@/lib/utils";

export function AdminCreditBanner() {
  const { barbershopId } = useAdminBarbershop();
  const [shop, setShop] = useState<BarbershopRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from(SHOWCASE_TABLES.barbershops)
        .select("id, name, slug, email, sms_price, credit_balance")
        .eq("id", barbershopId)
        .single();
      if (!cancelled && !error && data) {
        setShop({
          ...data,
          sms_price: Number(data.sms_price),
          credit_balance: Number(data.credit_balance),
        });
      }
    };

    void load();

    const channel = supabase
      .channel(`barbershop-credit-${barbershopId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: SHOWCASE_TABLES.barbershops,
          filter: `id=eq.${barbershopId}`,
        },
        (payload) => {
          const row = payload.new as BarbershopRow;
          setShop({
            ...row,
            sms_price: Number(row.sms_price),
            credit_balance: Number(row.credit_balance),
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [barbershopId]);

  if (!shop) return null;

  const credit = shop.credit_balance;
  const smsPrice = shop.sms_price;

  let alert: { tone: "orange" | "red"; message: string } | null = null;
  if (credit <= smsPrice) {
    alert = {
      tone: "red",
      message:
        "SMS připomínky byly vypnuty kvůli nedostatku kreditu! Zákazníkům nyní nechodí upozornění.",
    };
  } else if (credit > 0 && credit <= 10) {
    alert = {
      tone: "orange",
      message: `Pozor, váš kredit klesá. Zbývá vám posledních pár SMS (cca ${Math.floor(credit / smsPrice)}). Dobijte si prosím konto.`,
    };
  }

  return (
    <>
      {alert && (
        <div
          role="alert"
          className={cn(
            "sticky top-[57px] z-[9] w-full px-4 py-2 text-center text-sm font-medium border-b",
            alert.tone === "red"
              ? "bg-red-600/95 text-white border-red-700"
              : "bg-amber-500/95 text-amber-950 border-amber-600",
          )}
        >
          {alert.tone === "red" ? "🛑 " : "⚠️ "}
          {alert.message}
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/80 px-5 py-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Konto SMS</p>
          <p className="font-display text-2xl text-foreground mt-1">
            {credit.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>
            Cena 1 SMS:{" "}
            <span className="font-medium text-foreground">
              {smsPrice.toLocaleString("cs-CZ", { minimumFractionDigits: 2 })} Kč
            </span>
          </p>
          <p className="mt-0.5">
            Zbývá cca{" "}
            <span className="font-medium text-gold">
              {credit >= smsPrice ? Math.floor(credit / smsPrice) : 0}
            </span>{" "}
            připomínek
          </p>
        </div>
      </div>
    </>
  );
}
