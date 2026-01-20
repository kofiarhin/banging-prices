// Pages/PostSignup/PostSignup.jsx
import { useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PostRegisterPage = () => {
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const { isLoaded, user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const syncUser = async () => {
      const payload = {
        clerkId: user.id,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.primaryEmailAddress?.emailAddress || "",
        imageUrl: user.imageUrl || "",
      };

      await fetch(`${baseUrl}/api/auth/post-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      navigate("/login", { replace: true });
    };

    syncUser();
  }, [isLoaded, user, navigate]);

  return <div>Creating your account...</div>;
};

export default PostRegisterPage;
