import {
  CATEGORY_LABELS,
  SERVICES,
  type ServiceCategory,
} from "@/lib/reservation-data";

export type BookingServiceCategory = ServiceCategory;

export const BOOKING_CATEGORY_ORDER: BookingServiceCategory[] = [
  "package",
  "hair",
  "beard",
  "extras",
];

export function getServiceCategoryByName(name: string): BookingServiceCategory {
  const exact = SERVICES.find((s) => s.name === name);
  if (exact) return exact.category;

  const lower = name.toLowerCase();
  if (
    lower.includes("komplet") ||
    lower.includes("vip") ||
    lower.includes("donzi komplet")
  ) {
    return "package";
  }
  if (
    lower.includes("vous") ||
    lower.includes("holení") ||
    lower.includes("shave") ||
    lower.includes("břitv")
  ) {
    return "beard";
  }
  if (
    lower.includes("masáž") ||
    lower.includes("chloup") ||
    lower.includes("kontur") ||
    lower.includes("umytí") ||
    lower.includes("styling")
  ) {
    return "extras";
  }
  return "hair";
}

export function getCategoryLabel(cat: BookingServiceCategory): string {
  return CATEGORY_LABELS[cat];
}
