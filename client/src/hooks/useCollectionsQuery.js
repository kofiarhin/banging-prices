import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

const fetchCollections = async (token) => {
  const res = await apiFetch("/api/collections", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.message || "Failed to fetch collections");
  }

  return payload;
};

const useCollectionsQuery = (token) =>
  useQuery({
    queryKey: ["collections"],
    queryFn: () => fetchCollections(token),
    enabled: !!token,
  });

export default useCollectionsQuery;
