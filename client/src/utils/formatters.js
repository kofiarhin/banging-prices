export const formatSecondsAgo = (seconds) => {
  if (!Number.isFinite(seconds)) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m ago`;
  return `${mins}m ago`;
};

export const fmtCurrency = (currency, price) => {
  const n = Number(price);
  const v = Number.isFinite(n) ? n : 0;

  const sym =
    currency === "GBP"
      ? "£"
      : currency === "USD"
        ? "$"
        : currency === "EUR"
          ? "€"
          : "";

  return `${sym}${v.toFixed(2)}`;
};
