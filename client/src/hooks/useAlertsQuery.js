import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

const fetchAlerts = async (token) => {
  const res = await apiFetch("/api/alerts", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json().catch(() => []);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch alerts");
  }

  return data; // your API returns an array
};

const useAlertsQuery = (token) =>
  useQuery({
    queryKey: ["alerts", token],
    queryFn: () => fetchAlerts(token),
    enabled: !!token,
  });

export default useAlertsQuery;
