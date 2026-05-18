import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

const deleteSavedProduct = async ({ productId, token }) => {
  const res = await apiFetch(`/api/products/saved-item/${productId}`, {
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
