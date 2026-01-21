import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import "./tracked-alerts.styles.scss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const formatMoney = (currency, value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return `${currency} ${value}`;
  return `${currency} ${n.toFixed(2)}`;
};

const formatType = (t) => {
  if (t === "price") return "PRICE";
  if (t === "percent") return "PERCENT";
  if (t === "stock") return "STOCK";
  return String(t || "").toUpperCase();
};

const formatTarget = (a) => {
  if (!a) return "-";
  if (a.type === "price")
    return formatMoney(a.currency || "GBP", a.targetPrice);
  if (a.type === "percent") return `${Number(a.targetPercent || 0)}%`;
  if (a.type === "stock") return "In stock";
  return "-";
};

const fetchAlerts = async (token) => {
  const res = await fetch(`${API_URL}/api/alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data?.message || "Failed to fetch tracked items");
  return data;
};

const deleteAlert = async ({ token, alertId }) => {
  const res = await fetch(`${API_URL}/api/alerts/${alertId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to stop tracking");
  return data;
};

const TrackedAlertsPage = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const qc = useQueryClient();

  const [token, setToken] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setToken("");
      return;
    }
    (async () => {
      const t = await getToken();
      setToken(t || "");
    })();
  }, [isLoaded, isSignedIn, getToken]);

  const {
    data: alerts = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => fetchAlerts(token),
    enabled: !!token && isLoaded && isSignedIn,
  });

  const { mutate: stopTracking, isPending: isStopping } = useMutation({
    mutationFn: ({ alertId }) => deleteAlert({ token, alertId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const activeCount = useMemo(
    () => (alerts || []).filter((a) => a?.isActive).length,
    [alerts],
  );

  if (!isLoaded) return <div className="ta-state">Loading...</div>;
  if (!isSignedIn)
    return (
      <div className="ta-state">
        <div className="ta-state-title">Sign in required</div>
        <div className="ta-state-sub">Log in to view your tracked items.</div>
      </div>
    );

  if (isLoading)
    return <div className="ta-state">Loading tracked items...</div>;
  if (isError) return <div className="ta-state">{error.message}</div>;

  return (
    <div className="ta-page">
      <div className="ta-container">
        <div className="ta-head">
          <div>
            <h1 className="ta-title">Tracked Items</h1>
            <p className="ta-sub">
              You have <span className="ta-strong">{activeCount}</span> active
              tracker{activeCount === 1 ? "" : "s"}.
            </p>
          </div>

          <div className="ta-actions">
            <Link to="/products" className="ta-btn ta-btn-ghost">
              Back to Feed
            </Link>
            <button
              className="ta-btn ta-btn-secondary"
              type="button"
              onClick={() => qc.invalidateQueries({ queryKey: ["alerts"] })}
            >
              Refresh
            </button>
          </div>
        </div>

        {!alerts?.length ? (
          <div className="ta-empty">
            <div className="ta-empty-title">No tracked items</div>
            <div className="ta-empty-sub">
              Open a product and hit{" "}
              <span className="ta-pill">Monitor Price</span> to start tracking.
            </div>
            <Link to="/products" className="ta-btn ta-btn-primary">
              Browse Deals
            </Link>
          </div>
        ) : (
          <div className="ta-grid">
            {alerts.map((a) => {
              const product = a?.productId;
              const productId = product?._id;
              const isActive = !!a?.isActive;
              const title = product?.title || "Unknown product";

              return (
                <div key={a._id} className="ta-card">
                  <div className="ta-card-media">
                    <img
                      src={product?.image}
                      alt={title}
                      loading="lazy"
                      className="ta-img"
                    />
                    <div
                      className={`ta-badge ${isActive ? "is-live" : "is-off"}`}
                    >
                      {isActive ? "Active" : "Triggered"}
                    </div>
                  </div>

                  <div className="ta-card-body">
                    <div className="ta-row ta-row-top">
                      <div className="ta-card-title">{title}</div>
                    </div>

                    <div className="ta-meta">
                      <div className="ta-meta-item">
                        <div className="ta-meta-label">Type</div>
                        <div className="ta-meta-value">
                          {formatType(a.type)}
                        </div>
                      </div>

                      <div className="ta-meta-item">
                        <div className="ta-meta-label">Target</div>
                        <div className="ta-meta-value">{formatTarget(a)}</div>
                      </div>

                      <div className="ta-meta-item">
                        <div className="ta-meta-label">Current</div>
                        <div className="ta-meta-value">
                          {product?.price != null
                            ? formatMoney(
                                product?.currency || "GBP",
                                product.price,
                              )
                            : "-"}
                        </div>
                      </div>
                    </div>

                    <div className="ta-card-actions">
                      <Link
                        to={productId ? `/products/${productId}` : "/products"}
                        className="ta-btn ta-btn-primary"
                      >
                        View
                      </Link>

                      <button
                        className="ta-btn ta-btn-danger"
                        type="button"
                        disabled={isStopping}
                        onClick={() => stopTracking({ alertId: a._id })}
                      >
                        {isStopping ? "Stopping..." : "Stop"}
                      </button>
                    </div>

                    {!isActive && a?.triggeredAt ? (
                      <div className="ta-footnote">
                        Triggered at {new Date(a.triggeredAt).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackedAlertsPage;
