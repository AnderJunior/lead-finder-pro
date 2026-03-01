import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const str = typeof d === "string" ? d : String(d);
  const datePart = str.slice(0, 10);
  const [y, m, day] = datePart.split("-");
  if (!y || !m || !day) return "—";
  return `${day}/${m}/${y}`;
}
