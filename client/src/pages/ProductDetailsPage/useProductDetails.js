/* client/src/pages/ProductDetailsPage/useProductDetails.js */
import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const useProductDetails = () => {
  const { id } = useParams();
  const qc = useQueryClient();
  const [activeIdx, setActiveIdx] = useState(0);

  const {
    data: p,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/products/${id}`,
      );
      if (!res.ok) throw new Error("Product sync failed");
      return res.json();
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 mins cache
  });

  const { data: similar = [] } = useQuery({
    queryKey: ["similar", p?.category, p?._id],
    queryFn: async () => {
      const params = new URLSearchParams({ category: p.category, limit: 5 });
      const res = await fetch(
        `${import.meta.env.VITE_api_URL}/api/products?${params}`,
      );
      const data = await res.json();
      return data.items?.filter((item) => item._id !== p._id) || [];
    },
    enabled: !!p?._id,
  });

  const gallery = useMemo(
    () => [p?.image, ...(p?.images || [])].filter(Boolean),
    [p],
  );

  return {
    p,
    similar,
    gallery,
    activeIdx,
    setActiveIdx,
    isLoading,
    isError,
    error,
    qc,
  };
};
