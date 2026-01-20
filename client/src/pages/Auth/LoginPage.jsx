import { SignIn } from "@clerk/clerk-react";
import "./auth.styles.scss";

const LoginPage = () => {
  return (
    <main className="pp-auth">
      <div className="pp-auth-container">
        <div className="pp-auth-card">
          <h1 className="pp-auth-title">Welcome back</h1>
          <p className="pp-auth-subtitle">Sign in to continue.</p>

          <div className="pp-auth-box">
            <SignIn
              routing="path"
              path="/login"
              signUpUrl="/register"
              forceRedirectUrl="/post-login"
              fallbackRedirectUrl="/dashboard"
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
