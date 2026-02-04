import { useQuery } from "@tanstack/react-query";
import "./store-insights.styles.scss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const fetchInsights = async () => {
  const res = await fetch(`${API_URL}/api/products/stores/insights`);
  const payload = await res.json();
  if (!res.ok) throw new Error(payload?.message || "Failed to load insights");
  return payload;
};

const formatTimeAgo = (iso) => {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const StoreInsightsPage = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["store-insights"],
    queryFn: fetchInsights,
  });

  if (isLoading) return <div className="si-state">Loading insights...</div>;
  if (isError) return <div className="si-state">{error.message}</div>;

  const stores = data?.stores || [];

  return (
    <main className="si-page">
      <div className="si-container">
        <header className="si-header">
          <h1 className="si-title">Store Insights</h1>
          <p className="si-sub">
            Retailer performance based on live product drops.
          </p>
        </header>

        <div className="si-grid">
          {stores.map((store) => (
            <div key={store.store} className="si-card">
              <div className="si-card-title">{store.storeName}</div>
              <div className="si-metrics">
                <div className="si-metric">
                  <div className="si-metric-value">{store.count}</div>
                  <div className="si-metric-label">Active items</div>
                </div>
                <div className="si-metric">
                  <div className="si-metric-value">{store.inStock}</div>
                  <div className="si-metric-label">In stock</div>
                </div>
                <div className="si-metric">
                  <div className="si-metric-value">
                    {store.avgDiscount || 0}%
                  </div>
                  <div className="si-metric-label">Avg discount</div>
                </div>
              </div>

              <div className="si-foot">
                Last seen {formatTimeAgo(store.lastSeenAt)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default StoreInsightsPage;
