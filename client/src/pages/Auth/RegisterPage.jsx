import { SignUp } from "@clerk/clerk-react";
import "./auth.styles.scss";

const RegisterPage = () => {
  return (
    <main className="pp-auth">
      <div className="pp-auth-container">
        <div className="pp-auth-card">
          <h1 className="pp-auth-title">Create your account</h1>
          <p className="pp-auth-subtitle">Get started in seconds.</p>

          <div className="pp-auth-box">
            <SignUp
              routing="path"
              path="/register"
              signInUrl="/login"
              redirectUrl="/post-register"
              afterSignUpUrl="/post-register"
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default RegisterPage;
