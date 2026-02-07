// client/src/App.jsx
import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop.jsx";

import Header from "./components/Header.jsx";
import Footer from "./components/Footer/Footer.jsx";

const HomePage = React.lazy(() => import("./pages/HomePage/HomePage.jsx"));
const ProductsPage = React.lazy(
  () => import("./pages/ProductsPage/ProductsPage.jsx"),
);
const ProductDetailsPage = React.lazy(
  () => import("./pages/ProductDetailsPage/ProductDetailsPage.jsx"),
);

const LoginPage = React.lazy(() => import("./pages/Auth/LoginPage.jsx"));
const RegisterPage = React.lazy(() => import("./pages/Auth/RegisterPage.jsx"));
const PostRegisterPage = React.lazy(
  () => import("./pages/Auth/PostRegisterPage.jsx"),
);
const DashboardPage = React.lazy(
  () => import("./pages/DashboardPage/DashboardPage.jsx"),
);
const SavedProductsPage = React.lazy(
  () => import("./pages/SavedProductsPage/SavedProductsPage.jsx"),
);
const PostLogin = React.lazy(() => import("./pages/PostLogin/PostLogin.jsx"));

const TrackedAlertsPage = React.lazy(
  () => import("./pages/tracked-alerts/TrackedAlertsPage.jsx"),
);
const StoreInsightsPage = React.lazy(
  () => import("./pages/StoreInsightsPage/StoreInsightsPage.jsx"),
);
const CollectionSharePage = React.lazy(
  () => import("./pages/CollectionSharePage/CollectionSharePage.jsx"),
);

const RouteFallback = () => (
  <div className="app-route-fallback">
    <div className="app-route-fallback__spinner" aria-hidden="true" />
    <div>Loading…</div>
  </div>
);

const Protected = ({ children }) => {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

const App = () => {
  const location = useLocation();

  const hideHeader =
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/register");

  return (
    <>
      <ScrollToTop />

      {!hideHeader && <Header />}

      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route
            path="/login/*"
            element={
              <>
                <SignedIn>
                  <Navigate to="/dashboard" replace />
                </SignedIn>
                <SignedOut>
                  <LoginPage />
                </SignedOut>
              </>
            }
          />

          <Route
            path="/register/*"
            element={
              <>
                <SignedIn>
                  <Navigate to="/post-register" replace />
                </SignedIn>
                <SignedOut>
                  <RegisterPage />
                </SignedOut>
              </>
            }
          />

          <Route
            path="/post-register"
            element={
              <Protected>
                <PostRegisterPage />
              </Protected>
            }
          />

          <Route
            path="/post-login"
            element={
              <Protected>
                <PostLogin />
              </Protected>
            }
          />

          <Route
            path="/saved-products"
            element={
              <Protected>
                <SavedProductsPage />
              </Protected>
            }
          />

          <Route
            path="/tracked"
            element={
              <Protected>
                <TrackedAlertsPage />
              </Protected>
            }
          />

          <Route
            path="/dashboard"
            element={
              <Protected>
                <DashboardPage />
              </Protected>
            }
          />

          <Route path="/insights" element={<StoreInsightsPage />} />
          <Route
            path="/collections/:shareId"
            element={<CollectionSharePage />}
          />

          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailsPage />} />
        </Routes>
      </Suspense>

      <Footer />
    </>
  );
};

export default App;
