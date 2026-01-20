import { useMutation, useQueryClient } from "@tanstack/react-query";

const deleteSavedProduct = async ({ productId, token }) => {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const res = await fetch(`${API_URL}/api/products/saved-item/${productId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.message || "Failed to delete saved product");
  }

  return payload;
};

const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, token }) =>
      deleteSavedProduct({ productId, token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-products"] });
    },
  });
};

export default useDeleteProduct;
