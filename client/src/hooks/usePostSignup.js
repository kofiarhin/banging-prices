import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

const postSignup = async (payload) => {
  const res = await apiFetch("/api/auth/post-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Signup failed");
  return data;
};

const usePostSignup = () => {
  return useMutation({
    mutationFn: postSignup,
    mutationKey: ["register"],
  });
};

export default usePostSignup;
