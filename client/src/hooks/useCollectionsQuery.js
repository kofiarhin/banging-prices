import { useQuery } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const fetchCollections = async (token) => {
  const res = await fetch(`${API_URL}/api/collections`, {
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
