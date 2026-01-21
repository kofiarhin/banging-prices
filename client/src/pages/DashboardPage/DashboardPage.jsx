import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import "./dashboard-page.styles.scss";

const safeJson = (val, fallback) => {
  try {
    const parsed = JSON.parse(val);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { isLoaded, user } = useUser();

  const fullName =
    user?.fullName || user?.firstName || user?.username || "User";

  const favoritesCount = useMemo(() => {
    const raw = localStorage.getItem("bp:favorites");
    const arr = safeJson(raw, []);
    return Array.isArray(arr) ? arr.length : 0;
  }, []);

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
              <div className="bp-metric-num">{favoritesCount}</div>
              <div className="bp-metric-label">Favorites</div>
            </div>

            {favoritesCount === 0 ? (
              <p className="bp-muted bp-small">
                Save products to see them here.
              </p>
            ) : null}

            <div className="bp-card-footer">
              <button
                className="bp-btn bp-btn-ghost"
                onClick={() => navigate("/products")}
                type="button"
              >
                View saved
              </button>
            </div>
          </article>

          <article className="bp-card">
            <h2 className="bp-card-title">Tracked</h2>

            <div className="bp-metric">
              <div className="bp-metric-num">0</div>
              <div className="bp-metric-label">Tracked products</div>
            </div>

            <p className="bp-muted bp-small">
              Track products to get notified when prices drop.
            </p>

            <div className="bp-card-footer">
              <button
                className="bp-btn bp-btn-ghost"
                onClick={() => navigate("/products")}
                type="button"
              >
                Browse products
              </button>
            </div>
          </article>

          <article className="bp-card">
            <h2 className="bp-card-title">Alerts</h2>

            <div className="bp-metric">
              <div className="bp-metric-num">0</div>
              <div className="bp-metric-label">Active alerts</div>
            </div>

            <p className="bp-muted bp-small">
              Create alerts to get email notifications for price drops.
            </p>

            <div className="bp-card-footer">
              <button className="bp-btn bp-btn-ghost" type="button" disabled>
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
