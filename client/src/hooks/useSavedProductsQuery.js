import { useQuery } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getSavedProducts = async (token) => {
  const res = await fetch(`${API_URL}/api/products/saved`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(payload.message || "Failed to fetch saved products");
  }

  return payload;
};

const useSavedProductsQuery = (token) =>
  useQuery({
    queryKey: ["saved-products"], // or ["saved_products", token]
    queryFn: () => getSavedProducts(token),
    enabled: !!token,
  });

export default useSavedProductsQuery;
