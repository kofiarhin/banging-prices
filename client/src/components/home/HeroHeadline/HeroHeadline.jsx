import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./hero-headline.styles.scss";

const HeroHeadline = ({
  title = "Discover the biggest price drops",
  subtitle = "Refresh your wardrobe for less.",
  align = "left",
  maxWidth = 980,
  animate = true,
  delay = 120,

  tickerLabel = "WHAT'S HOT RIGHT NOW",
  tickerItems = [],
  tickerSpeed = 28,
}) => {
  const [isIn, setIsIn] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setIsIn(true), Math.max(0, delay));
    return () => clearTimeout(t);
  }, [animate, delay]);

  const style = { textAlign: align, maxWidth };

  const items = useMemo(() => {
    const arr = Array.isArray(tickerItems) ? tickerItems : [];
    return arr
      .filter(Boolean)
      .map((x, idx) => {
        if (typeof x === "string") {
          return {
            id: `s-${idx}`,
            label: x,
            to: `/products?search=${encodeURIComponent(x)}&page=1`,
          };
        }

        const label = x.label || x.title || x.text || "";
        const to =
          x.to ||
          x.href ||
          (x.category
            ? `/products?category=${encodeURIComponent(x.category)}&page=1`
            : label
              ? `/products?search=${encodeURIComponent(label)}&page=1`
              : null);

        return {
          id: x.id || x._id || x.key || `i-${idx}`,
          label,
          to,
        };
      })
      .filter((x) => x.label && x.to)
      .slice(0, 18);
  }, [tickerItems]);

  const loop = useMemo(() => {
    if (!items.length) return [];
    return [...items, ...items];
  }, [items]);

  return (
    <section className="hero-headline" aria-label="Hero headline">
      <div
        className={`hero-headline-inner ${isIn ? "is-in" : ""}`}
        style={style}
      >
        <h1 className="hero-headline-title">{title}</h1>
        <p className="hero-headline-subtitle">{subtitle}</p>

        {!!items.length && (
          <div
            className="hero-headline-ticker"
            aria-label="Hot right now ticker"
          >
            <div className="hero-headline-ticker-label">{tickerLabel}</div>

            <div className="hero-headline-ticker-viewport">
              <div
                className="hero-headline-ticker-track"
                style={{ ["--ticker-speed"]: `${tickerSpeed}s` }}
              >
                {loop.map((it, idx) => (
                  <Link
                    key={`${it.id}-${idx}`}
                    to={it.to}
                    className="hero-headline-ticker-item"
                    title={it.label}
                  >
                    {it.label}
                  </Link>
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
