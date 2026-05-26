import { Clock, Mail, Phone, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Reservation } from "@/lib/reservations-by-day";
import { customerLabel } from "@/lib/reservations-by-day";

type Props = {
  rows: Reservation[];
  readOnly?: boolean;
  onDelete?: (id: string) => void;
};

export function AdminReservationDetailList({ rows, readOnly, onDelete }: Props) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm py-4">Žádné rezervace.</p>;
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className="rounded-lg border border-border p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <User className="h-4 w-4 text-gold" />
              {customerLabel(r)}
            </div>
            {!readOnly && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive shrink-0"
                onClick={() => onDelete(r.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Odebrat
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground pl-6">{r.service}</p>
          <div className="flex flex-wrap gap-3 text-sm pl-6 text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {r.booking_time}
              {r.duration_minutes ? ` · ${r.duration_minutes} min` : ""}
            </span>
            <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Phone className="h-3.5 w-3.5" /> {r.phone}
            </a>
            <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Mail className="h-3.5 w-3.5" /> {r.email}
            </a>
          </div>
          {r.total_price != null && (
            <p className="text-sm pl-6 font-medium">{Number(r.total_price).toLocaleString("cs-CZ")} Kč</p>
          )}
        </li>
      ))}
    </ul>
  );
}
