// client/src/App.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

import Header from "./components/Header.jsx";
import Footer from "./components/Footer/Footer.jsx";

import HomePage from "./pages/HomePage/HomePage.jsx";
import ProductsPage from "./pages/ProductsPage/ProductsPage.jsx";
import ProductDetailsPage from "./pages/ProductDetailsPage/ProductDetailsPage.jsx";

import LoginPage from "./pages/Auth/LoginPage.jsx";
import RegisterPage from "./pages/Auth/RegisterPage.jsx";
import PostRegisterPage from "./pages/Auth/PostRegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage/DashboardPage.jsx";
import SavedProductsPage from "./pages/SavedProductsPage/SavedProductsPage.jsx";
import PostLogin from "./pages/PostLogin/PostLogin.jsx";

import TrackedAlertsPage from "./pages/tracked-alerts/TrackedAlertsPage.jsx";
import StoreInsightsPage from "./pages/StoreInsightsPage/StoreInsightsPage.jsx";
import CollectionSharePage from "./pages/CollectionSharePage/CollectionSharePage.jsx";

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
      {!hideHeader && <Header />}

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
        <Route path="/collections/:shareId" element={<CollectionSharePage />} />

        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailsPage />} />
      </Routes>

      <Footer />
    </>
  );
};

export default App;
