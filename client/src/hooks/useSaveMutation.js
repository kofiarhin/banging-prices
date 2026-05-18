import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

const saveItem = async ({ id, token, collectionId }) => {
  if (!token) throw new Error("Unauthorized (missing token)");

  const res = await apiFetch("/api/products/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id, collectionId }),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    throw new Error(payload.message || "Something went wrong");
  }

  return payload;
};

const useSaveMutation = () =>
  useMutation({
    mutationKey: ["save_item"],
    mutationFn: saveItem,
  });

export default useSaveMutation;
