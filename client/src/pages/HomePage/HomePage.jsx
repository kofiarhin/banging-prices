/* client/src/pages/HomePage/HomePage.jsx */
import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useHomeQuery } from "../../hooks/useHomeQuery";
import "./home-page.styles.scss";

/* ---------- helpers ---------- */
const formatSecondsAgo = (seconds) => {
  if (!Number.isFinite(seconds)) return "—";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m ago`;
  }

  return `${mins}m ago`;
};
/* ----------------------------- */

const HomePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useHomeQuery();

  const modules = useMemo(
    () => [
      {
        id: "real-time",
        title: "Real-time Flash",
        desc: "Live price drop detection across 50+ UK fashion retailers.",
        icon: "bolt",
        to: "/products?sort=discount-desc&status=live",
      },
      {
        id: "volatility",
        title: "Price Volatility",
        desc: "Surface the biggest valuation shifts in the last 24 hours.",
        icon: "query_stats",
        to: "/products?sort=price-asc",
      },
      {
        id: "curated",
        title: "Value Intelligence",
        desc: "Curated sub-£20 opportunities with genuine upside.",
        icon: "insights",
        to: "/products?maxPrice=20",
      },
    ],
    [],
  );

  const onSearch = (e) => {
    e.preventDefault();
    const query = search.trim();
    if (!query) return;
    navigate(`/products?search=${encodeURIComponent(query)}`);
  };

  return (
    <main className="hp">
      <div className="hp-grid-overlay" />

      <div className="hp-container">
        {/* HERO */}
        <section className="hp-hero">
          <div className="hp-badge-wrapper">
            <span className="hp-badge">SYSTEM STATUS: OPERATIONAL</span>

            <div className="hp-system-metrics">
              {isLoading && <span>Loading metrics…</span>}

              {!isLoading && !isError && (
                <>
                  <span>
                    Retailers active (last 6h): {data.system.retailersOnline} /{" "}
                    {data.system.retailersTotal}
                  </span>

                  <span>
                    Last scan:{" "}
                    {formatSecondsAgo(data.system.lastScanSecondsAgo)}
                  </span>

                  <span>Assets tracked: {data.system.assetsTracked}</span>
                </>
              )}

              {isError && <span>Metrics unavailable</span>}
            </div>
          </div>

          <h1 className="hp-title">
            The Smartest Way to Buy <br />
            <span className="hp-title-accent">Fashion in the UK.</span>
          </h1>

          <p className="hp-lead">
            Real-time price drops from 50+ UK retailers. Verified signals. No
            fake sales. No noise.
          </p>

          {/* SEARCH */}
          <form className="hp-search-box" onSubmit={onSearch}>
            <div className="hp-search-inner">
              <span className="material-symbols-outlined hp-search-icon">
                terminal
              </span>

              <input
                className="hp-input"
                placeholder='Search a brand, product, or retailer (e.g. "Stussy hoodie")'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <button
                type="submit"
                className="hp-search-submit"
                aria-label="Execute search"
              >
                <span className="material-symbols-outlined">north_east</span>
              </button>
            </div>

            <div className="hp-search-hint">
              Live market scan · No cached data · Updates every 60 seconds
            </div>

            <div className="hp-search-intents">
              <button type="button">🔥 Price drops today</button>
              <button type="button">📉 Biggest drops (24h)</button>
              <button type="button">💷 Under £20</button>
              <button type="button">🏷️ Resell value</button>
            </div>
          </form>

          <div className="hp-cta-row">
            <Link to="/products" className="hp-browse-link">
              BROWSE LIVE OPPORTUNITIES
              <span className="material-symbols-outlined">arrow_right_alt</span>
            </Link>
          </div>
        </section>

        {/* SNAPSHOT */}
        <section className="hp-snapshot">
          <h2 className="hp-section-label">Live Market Snapshot</h2>

          {isLoading && <p>Loading snapshot…</p>}

          {!isLoading && !isError && (
            <div className="hp-snapshot-grid">
              <div className="hp-snapshot-card">
                <span className="label">Top drop right now</span>
                <span className="value">
                  {data.snapshot.topDrop?.title} — ↓
                  {data.snapshot.topDrop?.discountPercent}%
                </span>
              </div>

              <div className="hp-snapshot-card">
                <span className="label">Biggest volatility today</span>
                <span className="value">
                  {data.snapshot.biggestVolatility?.title} — ↓
                  {data.snapshot.biggestVolatility?.discountPercent}%
                </span>
              </div>

              <div className="hp-snapshot-card">
                <span className="label">Most searched brand</span>
                <span className="value">{data.snapshot.mostSearchedBrand}</span>
              </div>
            </div>
          )}
        </section>

        {/* INTELLIGENCE MODULES */}
        <section className="hp-matrix">
          <div className="hp-section-header">
            <h2 className="hp-section-label">Core Intelligence Modules</h2>
            <p className="hp-section-sub">
              We track prices like traders track markets.
            </p>
          </div>

          <div className="hp-grid">
            {modules.map((m) => (
              <div
                key={m.id}
                className="hp-card"
                onClick={() => navigate(m.to)}
              >
                <div className="hp-card-content">
                  <span className="material-symbols-outlined hp-card-icon">
                    {m.icon}
                  </span>
                  <h3 className="hp-card-title">{m.title}</h3>
                  <p className="hp-card-desc">{m.desc}</p>
                </div>
                <div className="hp-card-border" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default HomePage;
