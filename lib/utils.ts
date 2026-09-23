export function taka(amount: number | null | undefined) {
  const safeAmount = Number(amount ?? 0);

  return `৳${safeAmount.toLocaleString("en-BD")}`;
}

export function calculateTotalEarning(
  dailyEarning: number | null | undefined,
  durationDays: number | null | undefined
) {
  const daily = Number(dailyEarning ?? 0);
  const days = Number(durationDays ?? 0);

  return daily * days;
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}