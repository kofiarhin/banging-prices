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
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
