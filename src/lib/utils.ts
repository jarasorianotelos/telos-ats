import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"
import { toZonedTime } from "date-fns-tz"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateToEST(date: string | Date, formatString: string = "MM/dd/yyyy hh:mm a"): string {
  if (!date) return "N/A"
  
  const estDate = toZonedTime(new Date(date), "America/New_York")
  return format(estDate, formatString)
}

export function formatDistanceToNowEST(date: string | Date): string {
  if (!date) return "Unknown date"
  
  const estDate = toZonedTime(new Date(date), "America/New_York")
  return formatDistanceToNow(estDate, { addSuffix: true })
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export function formatCurrencyPHP(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}