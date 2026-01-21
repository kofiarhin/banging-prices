import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import useSavedProductsQuery from "../../hooks/useSavedProductsQuery";
import useAlertsQuery from "../../hooks/useAlertsQuery";
import "./dashboard-page.styles.scss";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { isLoaded, user } = useUser();
  const { getToken } = useAuth();

  const fullName =
    user?.fullName || user?.firstName || user?.username || "User";

  const {
    data: token,
    isLoading: isTokenLoading,
    error: tokenError,
  } = useQuery({
    queryKey: ["clerk-token"],
    queryFn: () => getToken(),
    enabled: isLoaded,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: savedPayload,
    isLoading: isSavedLoading,
    error: savedError,
  } = useSavedProductsQuery(token);

  const {
    data: alerts,
    isLoading: isAlertsLoading,
    error: alertsError,
  } = useAlertsQuery(token);

  const favoritesCount = useMemo(() => {
    const arr =
      savedPayload?.data ||
      savedPayload?.products ||
      savedPayload?.savedProducts ||
      savedPayload ||
      [];
    return Array.isArray(arr) ? arr.length : 0;
  }, [savedPayload]);

  const trackedCount = useMemo(() => {
    const arr = Array.isArray(alerts) ? alerts : [];
    return arr.length;
  }, [alerts]);

  const activeAlertsCount = useMemo(() => {
    const arr = Array.isArray(alerts) ? alerts : [];
    return arr.filter((a) => a?.isActive).length;
  }, [alerts]);

  if (!isLoaded) {
    return (
      <main className="bp-dashboard">
        <div className="bp-dashboard-container">
          <p className="bp-muted">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bp-dashboard">
      <div className="bp-dashboard-container">
        <header className="bp-dash-header">
          <p className="bp-dash-welcome">
            Welcome back, <span className="bp-accent">{fullName}</span>
          </p>
          <p className="bp-dash-subtext">Here’s your snapshot.</p>
        </header>

        <section className="bp-grid">
          <article className="bp-card">
            <h2 className="bp-card-title">Saved</h2>

            <div className="bp-metric">
              <div className="bp-metric-num">
                {isTokenLoading || isSavedLoading ? "…" : favoritesCount}
              </div>
              <div className="bp-metric-label">Saved products</div>
            </div>

            {tokenError || savedError ? (
              <p className="bp-muted bp-small">
                Failed to load saved products.
              </p>
            ) : favoritesCount === 0 ? (
              <p className="bp-muted bp-small">
                Save products to see them here.
              </p>
            ) : null}

            <div className="bp-card-footer">
              <button
                className="bp-btn bp-btn-ghost"
                onClick={() => navigate("/saved-products")}
                type="button"
              >
                View saved
              </button>
            </div>
          </article>

          <article className="bp-card">
            <h2 className="bp-card-title">Tracked</h2>

            <div className="bp-metric">
              <div className="bp-metric-num">
                {isTokenLoading || isAlertsLoading ? "…" : trackedCount}
              </div>
              <div className="bp-metric-label">Tracked products</div>
            </div>

            {tokenError || alertsError ? (
              <p className="bp-muted bp-small">Failed to load tracked items.</p>
            ) : trackedCount === 0 ? (
              <p className="bp-muted bp-small">
                Track products to get notified when prices drop.
              </p>
            ) : null}

            <div className="bp-card-footer">
              <button
                className="bp-btn bp-btn-ghost"
                onClick={() => navigate("/tracked")}
                type="button"
              >
                View tracked
              </button>
            </div>
          </article>

          <article className="bp-card">
            <h2 className="bp-card-title">Alerts</h2>

            <div className="bp-metric">
              <div className="bp-metric-num">
                {isTokenLoading || isAlertsLoading ? "…" : activeAlertsCount}
              </div>
              <div className="bp-metric-label">Active alerts</div>
            </div>

            {tokenError || alertsError ? (
              <p className="bp-muted bp-small">Failed to load alerts.</p>
            ) : activeAlertsCount === 0 ? (
              <p className="bp-muted bp-small">
                Create alerts to get email notifications for price drops.
              </p>
            ) : (
              <p className="bp-muted bp-small">
                You’ll be emailed when your alert conditions are met.
              </p>
            )}

            <div className="bp-card-footer">
              <button
                className="bp-btn bp-btn-ghost"
                type="button"
                onClick={() => navigate("/tracked")}
              >
                Manage alerts
              </button>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
};

export default DashboardPage;
