import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useHomeQuery } from "../../hooks/useHomeQuery";
import "./home-page.styles.scss";

/* ---------- helpers ---------- */
const formatSecondsAgo = (seconds) => {
  if (!Number.isFinite(seconds)) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m ago`;
  return `${mins}m ago`;
};

const money = (currency, value) => {
  if (!currency) return value;
  if (value === null || value === undefined) return "—";
  return `${currency}${value}`;
};
/* ----------------------------- */

const HomePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useHomeQuery();

  const tiles = useMemo(
    () => [
      { label: "Biggest drops", to: "/products?sort=discount-desc" },
      { label: "Under £20", to: "/products?maxPrice=20&sort=discount-desc" },
      { label: "Newly detected", to: "/products?sort=newest" },
      { label: "Men", to: "/products?gender=men&sort=discount-desc" },
      { label: "Women", to: "/products?gender=women&sort=discount-desc" },
      { label: "Browse all", to: "/products" },
    ],
    [],
  );

  const onSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    navigate(`/products?search=${encodeURIComponent(q)}`);
  };

  const sections = Array.isArray(data?.sections) ? data.sections : [];

  const featured = data?.featured || null;

  return (
    <main className="hp">
      <div className="hp-grid-overlay" />
      <div className="hp-scanline" />

      <div className="hp-container">
        {/* HERO */}
        <section className="hp-hero">
          <div className="hp-toprow">
            <div className="hp-badge-wrapper">
              <span className="hp-badge">
                <span className="hp-pulse-dot" aria-hidden="true" />
                SYSTEM STATUS: OPERATIONAL
              </span>

              <div className="hp-system-metrics" aria-label="System metrics">
                {isLoading && <span>Loading metrics…</span>}

                {!isLoading && !isError && data?.system && (
                  <>
                    <span>
                      Retailers active (6h): {data.system.retailersOnline} /{" "}
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

            <Link to="/products" className="hp-ghost-link">
              Browse live
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_right_alt
              </span>
            </Link>
          </div>

          <h1 className="hp-title">
            Buy smarter.
            <br />
            <span className="hp-title-accent">
              Catch real fashion drops in the UK.
            </span>
          </h1>

          <p className="hp-lead">
            Real-time price movements across UK retailers. Clean signals. No
            fake sales.
          </p>

          {/* SEARCH */}
          <form className="hp-search-box" onSubmit={onSearch}>
            <div className="hp-search-inner">
              <span
                className="material-symbols-outlined hp-search-icon"
                aria-hidden="true"
              >
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
                aria-label="Search"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  north_east
                </span>
              </button>
            </div>

            <div className="hp-search-hint">
              Live scan • No cached data • Updates continuously
            </div>
          </form>

          {/* QUICK TILES */}
          <div className="hp-tiles" aria-label="Quick shortcuts">
            {tiles.map((t) => (
              <button
                key={t.to}
                type="button"
                className="hp-tile"
                onClick={() => navigate(t.to)}
              >
                <span className="hp-tile-label">{t.label}</span>
                <span
                  className="material-symbols-outlined hp-tile-icon"
                  aria-hidden="true"
                >
                  arrow_right_alt
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* FEATURED */}
        {!!featured && (
          <section className="hp-featured" aria-label="Featured">
            <div className="hp-featured-card">
              <div className="hp-featured-media" aria-hidden="true">
                <img
                  src={featured.imageUrl}
                  alt={featured.title || "Featured"}
                  className="hp-featured-img"
                  loading="lazy"
                  draggable="false"
                />
                <div className="hp-featured-overlay" />
              </div>

              <div className="hp-featured-body">
                <div className="hp-featured-kicker">Featured</div>
                <div className="hp-featured-title">{featured.title}</div>
                {!!featured.subtitle && (
                  <div className="hp-featured-sub">{featured.subtitle}</div>
                )}

                <button
                  type="button"
                  className="hp-featured-cta"
                  onClick={() => navigate(featured.to || "/products")}
                >
                  Explore
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    north_east
                  </span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* SECTIONS (PriceSpy-style strips) */}
        <section className="hp-sections" aria-label="Home sections">
          {isLoading && (
            <div className="hp-loading">Loading live opportunities…</div>
          )}
          {!isLoading && isError && (
            <div className="hp-loading">Home intelligence unavailable.</div>
          )}

          {!isLoading && !isError && sections.length === 0 && (
            <div className="hp-loading">
              No sections configured. Try browsing live opportunities.
            </div>
          )}

          {!isLoading &&
            !isError &&
            sections.map((s) => (
              <div key={s.id || s.title} className="hp-section">
                <div className="hp-section-head">
                  <div className="hp-section-left">
                    <h2 className="hp-section-title">{s.title}</h2>
                    {!!s.subtitle && (
                      <p className="hp-section-sub">{s.subtitle}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    className="hp-seeall"
                    onClick={() => navigate(s.seeAllUrl || "/products")}
                  >
                    See all
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      arrow_right_alt
                    </span>
                  </button>
                </div>

                <div className="hp-strip" role="list">
                  {(s.items || []).map((p) => (
                    <Link
                      key={p._id}
                      to={`/products/${p._id}`}
                      className="hp-item"
                      role="listitem"
                    >
                      <div className="hp-item-media">
                        <img
                          src={p.image}
                          alt={p.title}
                          className="hp-item-img"
                          loading="lazy"
                          draggable="false"
                        />

                        {Number(p.discountPercent) > 0 && (
                          <div className="hp-item-badge">
                            -{p.discountPercent}%
                          </div>
                        )}
                      </div>

                      <div className="hp-item-body">
                        <div className="hp-item-store">
                          {p.storeName || p.store}
                        </div>
                        <div className="hp-item-title">{p.title}</div>

                        <div className="hp-item-price">
                          <span className="hp-item-now">
                            {money(p.currency, p.price)}
                          </span>
                          {!!p.originalPrice && (
                            <span className="hp-item-was">
                              {money(p.currency, p.originalPrice)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </section>

        {/* SNAPSHOT (optional) */}
        {!!data?.snapshot && (
          <section className="hp-snapshot" aria-label="Market snapshot">
            <div className="hp-snapshot-head">
              <div className="hp-snapshot-title">Live market snapshot</div>
              <div className="hp-snapshot-note">Fast read. Real signals.</div>
            </div>

            <div className="hp-snapshot-grid">
              <div className="hp-snapshot-card">
                <div className="hp-snapshot-label">Top drop right now</div>
                <div className="hp-snapshot-value">
                  {data.snapshot.topDrop?.title || "—"}{" "}
                  {data.snapshot.topDrop?.discountPercent
                    ? `— ↓${data.snapshot.topDrop.discountPercent}%`
                    : ""}
                </div>
              </div>

              <div className="hp-snapshot-card">
                <div className="hp-snapshot-label">
                  Biggest volatility today
                </div>
                <div className="hp-snapshot-value">
                  {data.snapshot.biggestVolatility?.title || "—"}{" "}
                  {data.snapshot.biggestVolatility?.discountPercent
                    ? `— ↓${data.snapshot.biggestVolatility.discountPercent}%`
                    : ""}
                </div>
              </div>

              <div className="hp-snapshot-card">
                <div className="hp-snapshot-label">Most searched brand</div>
                <div className="hp-snapshot-value">
                  {data.snapshot.mostSearchedBrand || "—"}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default HomePage;
