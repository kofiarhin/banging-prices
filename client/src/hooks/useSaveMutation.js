import { useMutation } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const saveItem = async ({ id, token }) => {
  if (!token) throw new Error("Unauthorized (missing token)");

  const res = await fetch(`${API_URL}/api/products/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id }),
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
