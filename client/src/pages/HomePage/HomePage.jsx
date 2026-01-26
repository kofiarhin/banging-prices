import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useHomeQuery } from "../../hooks/useHomeQuery";
import HeroCarousel from "../../components/HeroCarousel/HeroCarousel";
import "./home-page.styles.scss";

const formatSecondsAgo = (seconds) => {
  if (!Number.isFinite(seconds)) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m ago`;
  return `${mins}m ago`;
};

const fmtCurrency = (currency, price) => {
  const n = Number(price);
  const v = Number.isFinite(n) ? n : 0;
  const sym =
    currency === "GBP"
      ? "£"
      : currency === "USD"
        ? "$"
        : currency === "EUR"
          ? "€"
          : "";
  return `${sym}${v.toFixed(2)}`;
};

const HomePage = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useHomeQuery();
  const [q, setQ] = useState("");

  const system = data?.system || {};
  const sections = Array.isArray(data?.sections) ? data.sections : [];

  // backend may return either:
  // { heroCarousel: [...] } OR { carousel: { slides: [...] } } OR { carousel: { ... } }
  const slides = useMemo(() => {
    if (Array.isArray(data?.heroCarousel)) return data.heroCarousel;
    if (Array.isArray(data?.carousel?.slides)) return data.carousel.slides;
    if (Array.isArray(data?.carousel)) return data.carousel;
    return [];
  }, [data]);

  const onSearch = (e) => {
    e.preventDefault();
    const query = String(q || "").trim();
    if (!query) return;
    navigate(`/products?search=${encodeURIComponent(query)}&page=1`);
  };

  return (
    <div className="pp-home">
      <div className="pp-container">
        {/* HERO */}
        <section className="pp-hero">
          <div className="pp-hero-inner">
            <div className="pp-hero-copy">
              <div className="pp-hero-kicker">
                <span className="pp-hero-dot" />
                LIVE MARKET TRACKING
              </div>

              <h1 className="pp-hero-title">
                Real fashion price drops.
                <br />
                <span className="pp-hero-accent">
                  Tracked live across UK retailers.
                </span>
              </h1>

              <p className="pp-hero-subtitle">
                We monitor real prices in real time to surface only genuine
                drops — not sale labels or promo noise.
              </p>

              <form className="pp-hero-search" onSubmit={onSearch}>
                <div className="pp-hero-searchbar">
                  <span className="pp-hero-searchicon" aria-hidden="true">
                    ⌕
                  </span>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search a product or brand..."
                    aria-label="Search products"
                  />
                </div>
                <button className="pp-hero-searchbtn" type="submit">
                  ↗
                </button>
              </form>
            </div>

            <div className="pp-hero-right">
              {!isLoading && slides.length > 0 ? (
                <HeroCarousel slides={slides} />
              ) : (
                <div className="pp-hero-carousel-skel" aria-hidden="true" />
              )}
            </div>
          </div>
        </section>

        {/* HOW + STATS */}
        <section className="pp-how">
          <div className="pp-how-head">
            <h3>How we track real price drops</h3>
          </div>

          <div className="pp-how-grid">
            <div className="pp-how-steps">
              <div className="pp-step">
                <span className="pp-step-k">SCAN</span>
                <p>Continuous monitoring across UK retailers.</p>
              </div>

              <div className="pp-step">
                <span className="pp-step-k">VERIFY</span>
                <p>
                  Prices compared over time to filter fake sales and inflated
                  discounts.
                </p>
              </div>

              <div className="pp-step">
                <span className="pp-step-k">SURFACE</span>
                <p>Only genuine price drops appear — live.</p>
              </div>
            </div>

            <div className="pp-live-stats">
              <div className="pp-stat">
                <div className="pp-stat-num">
                  {Number(system.retailersOnline || 0)}
                </div>
                <div className="pp-stat-label">Retailers monitored</div>
              </div>

              <div className="pp-stat">
                <div className="pp-stat-num">
                  {Number(system.assetsTracked || 0)}
                </div>
                <div className="pp-stat-label">Products tracked</div>
              </div>

              <div className="pp-stat">
                <div className="pp-stat-num">
                  {formatSecondsAgo(system.lastScanSecondsAgo)}
                </div>
                <div className="pp-stat-label">Last scan</div>
              </div>

              <div className="pp-stat">
                <div className="pp-stat-num">
                  {Number(system.verifiedDropsToday || 0)}
                </div>
                <div className="pp-stat-label">Verified drops today</div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTIONS */}
        <section className="pp-sections">
          {isError && (
            <div className="pp-home-error">Failed to load home feed.</div>
          )}

          {isLoading && (
            <div className="pp-home-loading">Loading live market feed…</div>
          )}

          {!isLoading &&
            sections.map((sec) => (
              <div key={sec.id} className="pp-section">
                <div className="pp-section-head">
                  <div className="pp-section-titlewrap">
                    <h3 className="pp-section-title">{sec.title}</h3>
                    {sec.subtitle ? (
                      <p className="pp-section-subtitle">{sec.subtitle}</p>
                    ) : null}
                  </div>

                  {sec.seeAllUrl ? (
                    <Link className="pp-seeall" to={sec.seeAllUrl}>
                      See all <span className="pp-seeall-arrow">→</span>
                    </Link>
                  ) : null}
                </div>

                <div className="pp-strip">
                  {(sec.items || []).map((p) => (
                    <Link
                      key={p._id}
                      className="pp-card"
                      to={`/products/${p._id}`}
                    >
                      <div className="pp-card-media">
                        {p.discountPercent ? (
                          <div className="pp-badge">-{p.discountPercent}%</div>
                        ) : null}

                        <img
                          className="pp-card-img"
                          src={p.image}
                          alt={p.title}
                          loading="lazy"
                        />
                      </div>

                      <div className="pp-card-details">
                        <div className="pp-card-store">
                          {p.storeName || p.store}
                        </div>

                        <div className="pp-card-title">{p.title}</div>

                        <div className="pp-card-price">
                          <div className="pp-card-now">
                            {fmtCurrency(p.currency, p.price)}
                          </div>

                          {p.originalPrice ? (
                            <div className="pp-card-was">
                              {fmtCurrency(p.currency, p.originalPrice)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </section>
      </div>
    </div>
  );
};

export default HomePage;
