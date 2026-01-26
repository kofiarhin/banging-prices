import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./hero-carousel.styles.scss";

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

const clampIndex = (i, len) => {
  if (!len) return 0;
  const mod = i % len;
  return mod < 0 ? mod + len : mod;
};

const HeroCarousel = ({ slides = [], autoMs = 4500 }) => {
  const safeSlides = useMemo(
    () => (Array.isArray(slides) ? slides : []),
    [slides],
  );
  const len = safeSlides.length;

  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);

  const next = () => setActive((v) => clampIndex(v + 1, len));
  const prev = () => setActive((v) => clampIndex(v - 1, len));

  useEffect(() => {
    if (!len) return;

    const t = setInterval(() => {
      if (pausedRef.current) return;
      setActive((v) => clampIndex(v + 1, len));
    }, autoMs);

    return () => clearInterval(t);
  }, [len, autoMs]);

  if (!len) return null;

  const current = safeSlides[clampIndex(active, len)];
  const title = current?.label || "Live feed";
  const to = current?.to || "/products?page=1";
  const items = Array.isArray(current?.items) ? current.items.slice(0, 4) : [];

  return (
    <div
      className="pp-hero-carousel"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      onFocus={() => {
        pausedRef.current = true;
      }}
      onBlur={() => {
        pausedRef.current = false;
      }}
    >
      <div className="pp-hero-carousel-header">
        <div className="pp-hero-carousel-title">
          <h4>{title}</h4>
          <p>Live market snapshot</p>
        </div>

        <div className="pp-hero-carousel-controls">
          <button
            type="button"
            className="pp-hero-navbtn"
            onClick={prev}
            aria-label="Previous"
          >
            ←
          </button>

          <div className="pp-hero-dots" role="tablist" aria-label="Slides">
            {safeSlides.map((s, idx) => (
              <button
                key={s.key || `${idx}`}
                type="button"
                className={`pp-hero-dot ${idx === active ? "is-active" : ""}`}
                onClick={() => setActive(idx)}
                aria-label={`Go to ${s.label || `slide ${idx + 1}`}`}
                aria-pressed={idx === active}
              />
            ))}
          </div>

          <button
            type="button"
            className="pp-hero-navbtn"
            onClick={next}
            aria-label="Next"
          >
            →
          </button>
        </div>
      </div>

      <div className="pp-hero-carousel-body">
        <div className="pp-hero-slide is-active">
          <div className="pp-hero-slide-grid">
            {items.map((p) => (
              <Link
                key={p._id}
                to={`/products/${p._id}`}
                className="pp-hero-mini-card"
              >
                <div className="pp-hero-mini-media">
                  {p.discountPercent ? (
                    <div className="pp-hero-mini-badge">
                      -{p.discountPercent}%
                    </div>
                  ) : null}

                  <img
                    src={p.image}
                    alt={p.title}
                    loading="lazy"
                    draggable="false"
                  />
                </div>

                <div className="pp-hero-mini-meta">
                  <div className="pp-hero-mini-store">
                    {p.storeName || p.store}
                  </div>
                  <div className="pp-hero-mini-title">{p.title}</div>

                  <div className="pp-hero-mini-price">
                    <div className="pp-hero-mini-now">
                      {fmtCurrency(p.currency, p.price)}
                    </div>
                    {p.originalPrice ? (
                      <div className="pp-hero-mini-was">
                        {fmtCurrency(p.currency, p.originalPrice)}
                      </div>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="pp-hero-carousel-footer">
        <div className="pp-hero-live">
          <span className="pulse" aria-hidden="true" />
          LIVE FEED
        </div>

        <Link to={to} className="pp-hero-viewfeed">
          View feed <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </div>
  );
};

export default HeroCarousel;
