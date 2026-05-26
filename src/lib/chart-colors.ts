/** Viditelné barvy na tmavém pozadí adminu / grafů. */
export const CHART_BAR_COLORS = [
  "hsl(43 74% 52%)",
  "hsl(199 75% 55%)",
  "hsl(152 55% 48%)",
  "hsl(280 60% 62%)",
  "hsl(12 78% 58%)",
  "hsl(48 90% 58%)",
  "hsl(330 65% 58%)",
  "hsl(175 55% 48%)",
] as const;

export function chartBarColor(index: number): string {
  return CHART_BAR_COLORS[index % CHART_BAR_COLORS.length];
}

export const CHART_EARNED_COLOR = "hsl(43 74% 52%)";
export const CHART_PLANNED_COLOR = "hsl(199 75% 55%)";
