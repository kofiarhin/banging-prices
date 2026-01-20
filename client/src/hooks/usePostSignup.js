import { useMutation } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const postSignup = async (payload) => {
  const res = await fetch(`${API_URL}/api/auth/post-signup`, {
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
    onSuccess: (data) => {
      console.log("xxxxxxxxxxxxxxxxxxxxxxxx");
      //navigate to dashboard
    },
  });
};

export default usePostSignup;
