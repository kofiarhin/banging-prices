import { useQuery } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const fetchHome = async () => {
  const res = await fetch(`${API_URL}/api/home`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to load home intelligence");
  }

  return res.json();
};

export const useHomeQuery = () => {
  return useQuery({
    queryKey: ["home"],
    queryFn: fetchHome,
    staleTime: 5 * 60 * 1000,  // 5 min — home data changes only between crawls
    gcTime: 10 * 60 * 1000,    // keep in cache for 10 min after unmount
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
