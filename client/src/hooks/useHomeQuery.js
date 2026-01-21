import { useQuery } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL;

const fetchHome = async () => {
  if (!API_URL) {
    throw new Error("VITE_API_URL is not defined");
  }

  const res = await fetch(`${API_URL}/api/home`);

  if (!res.ok) {
    throw new Error("Failed to fetch home intelligence");
  }

  return res.json();
};

export const useHomeQuery = () => {
  return useQuery({
    queryKey: ["home-intelligence"],
    queryFn: fetchHome,
    staleTime: 60_000, // 60 seconds
    refetchOnWindowFocus: false,
  });
};
