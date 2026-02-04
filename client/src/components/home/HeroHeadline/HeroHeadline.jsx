import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./hero-headline.styles.scss";

const HeroHeadline = ({
  title = "The biggest price drops, tracked in real time",
  subtitle = "Live price tracking across thousands of products.",
  align = "left",
  maxWidth = 980,
  animate = true,
  delay = 120,

  tickerLabel = "TRENDING NOW",
  tickerItems = [],
  tickerSpeed = 32,

  primaryCta = {
    label: "Browse biggest drops",
    to: "/products?sort=discount-desc&page=1",
  },
  secondaryCta = {
    label: "Search products",
    to: "#search",
  },

  children,
}) => {
  const [isIn, setIsIn] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setIsIn(true), Math.max(0, delay));
    return () => clearTimeout(t);
  }, [animate, delay]);

  const style = { textAlign: align, maxWidth };

  const items = useMemo(() => {
    if (!Array.isArray(tickerItems)) return [];
    return tickerItems.slice(0, 18);
  }, [tickerItems]);

  const loop = useMemo(
    () => (items.length ? [...items, ...items] : []),
    [items],
  );

  return (
    <section className="hero-headline">
      <div
        className={`hero-headline-inner ${isIn ? "is-in" : ""}`}
        style={style}
      >
        <h1 className="hero-headline-title">
          The biggest <span className="accent">price drops</span>, tracked in
          real time
        </h1>

        <p className="hero-headline-subtitle">{subtitle}</p>

        <div className="hero-headline-cta">
          <Link to={primaryCta.to} className="hero-cta primary">
            {primaryCta.label}
          </Link>

          <Link to={"/login"} className="hero-cta secondary">
            Join Now
          </Link>
        </div>

        {children && <div className="hero-headline-stats">{children}</div>}

        {!!items.length && (
          <div className="hero-headline-ticker">
            <div className="hero-headline-ticker-label">{tickerLabel}</div>
            <div className="hero-headline-ticker-viewport">
              <div
                className="hero-headline-ticker-track"
                style={{ ["--ticker-speed"]: `${tickerSpeed}s` }}
              >
                {loop.map((it, idx) => (
                  <span key={idx} className="hero-headline-ticker-item">
                    {it.label || it}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroHeadline;
