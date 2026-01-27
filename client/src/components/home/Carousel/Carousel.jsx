import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./carousel.styles.scss";

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

const getTitleFromSlides = (slides) => {
  const s0 = slides?.[0] || {};
  return (
    s0.sectionTitle ||
    s0.category ||
    s0.group ||
    s0.titleGroup ||
    "Live market snapshot"
  );
};

const Carousel = ({ slides = [], isLoading }) => {
  const stripRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pagesCount, setPagesCount] = useState(1);
  const [isGrid, setIsGrid] = useState(false);

  const safeSlides = useMemo(
    () => (Array.isArray(slides) ? slides : []),
    [slides],
  );
  const title = useMemo(() => getTitleFromSlides(safeSlides), [safeSlides]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1100px)");
    const apply = () => setIsGrid(!!mq.matches);

    apply();

    if (mq.addEventListener) mq.addEventListener("change", apply);
    else mq.addListener(apply);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", apply);
      else mq.removeListener(apply);
    };
  }, []);

  const recalcPages = () => {
    if (isGrid) {
      setPagesCount(1);
      setActiveIndex(0);
      return;
    }

    const el = stripRef.current;
    if (!el) {
      setPagesCount(Math.min(6, Math.max(1, safeSlides.length)));
      return;
    }
    const page = el.clientWidth || 1;
    const total = el.scrollWidth || 1;
    const pages = Math.max(1, Math.round(total / page));
    setPagesCount(Math.min(8, pages));
  };

  const scrollByPage = (dir) => {
    if (isGrid) return;
    const el = stripRef.current;
    if (!el) return;
    const amount = Math.max(240, Math.floor(el.clientWidth * 0.92));
    el.scrollTo({ left: el.scrollLeft + dir * amount, behavior: "smooth" });
  };

  useEffect(() => {
    recalcPages();
    const t = setTimeout(recalcPages, 250);

    const onResize = () => recalcPages();
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeSlides.length, isGrid]);

  useEffect(() => {
    if (isGrid) return;

    const el = stripRef.current;
    if (!el) return;

    let raf = 0;

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const pageW = el.clientWidth || 1;
        const idx = Math.round(el.scrollLeft / pageW);
        setActiveIndex(Math.max(0, idx));
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [safeSlides.length, isGrid]);

  const isDisabledPrev = activeIndex <= 0;
  const isDisabledNext = activeIndex >= pagesCount - 1;

  if (isLoading) {
    return (
      <div className="pp-carousel">
        <div className="pp-carousel-shell">
          <div className="pp-carousel-top">
            <div className="pp-carousel-title-wrap">
              <h3 className="pp-carousel-title">{title}</h3>
              <p className="pp-carousel-subtitle">Loading live items…</p>
            </div>

            {!isGrid ? (
              <div className="pp-carousel-controls">
                <div className="pp-carousel-dots" aria-hidden="true">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span
                      key={i}
                      className={`pp-carousel-dot ${i === 0 ? "active" : ""}`}
                    />
                  ))}
                </div>

                <button
                  className="pp-carousel-btn"
                  disabled
                  type="button"
                  aria-label="Previous"
                >
                  ←
                </button>
                <button
                  className="pp-carousel-btn"
                  disabled
                  type="button"
                  aria-label="Next"
                >
                  →
                </button>
              </div>
            ) : null}
          </div>

          <div
            className={`pp-carousel-strip ${isGrid ? "is-grid" : ""}`}
            aria-hidden="true"
          >
            {Array.from({ length: isGrid ? 10 : 6 }).map((_, i) => (
              <div key={i} className="pp-carousel-item">
                <div className="pp-carousel-skel-card" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!safeSlides.length) return null;

  return (
    <div className="pp-carousel">
      <div className="pp-carousel-shell">
        <div className="pp-carousel-top">
          <div className="pp-carousel-title-wrap">
            <h3 className="pp-carousel-title">{title}</h3>
            <p className="pp-carousel-subtitle">Live market snapshot</p>
          </div>

          {!isGrid ? (
            <div className="pp-carousel-controls">
              <div className="pp-carousel-dots" aria-hidden="true">
                {Array.from({ length: pagesCount }).map((_, i) => (
                  <span
                    key={i}
                    className={`pp-carousel-dot ${i === activeIndex ? "active" : ""}`}
                  />
                ))}
              </div>

              <button
                className="pp-carousel-btn"
                onClick={() => scrollByPage(-1)}
                disabled={isDisabledPrev}
                type="button"
                aria-label="Previous"
              >
                ←
              </button>

              <button
                className="pp-carousel-btn"
                onClick={() => scrollByPage(1)}
                disabled={isDisabledNext}
                type="button"
                aria-label="Next"
              >
                →
              </button>
            </div>
          ) : null}
        </div>

        <div
          className={`pp-carousel-strip ${isGrid ? "is-grid" : ""}`}
          ref={stripRef}
        >
          {safeSlides.map((s, idx) => {
            const key = s?._id || s?.id || `${idx}-${s?.title || "slide"}`;
            const to = s?._id ? `/products/${s._id}` : s?.url || "/products";
            const store = s?.storeName || s?.store || s?.retailer || "";
            const name = s?.title || s?.name || "Product";
            const img = s?.image || s?.img || s?.thumbnail || "";
            const discount = s?.discountPercent;

            return (
              <div key={key} className="pp-carousel-item">
                {String(to || "").startsWith("http") ? (
                  <a
                    className="pp-carousel-link"
                    href={to}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="pp-carousel-card">
                      <div className="pp-carousel-media">
                        {discount ? (
                          <div className="pp-carousel-badge">-{discount}%</div>
                        ) : null}
                        {img ? (
                          <img
                            className="pp-carousel-img"
                            src={img}
                            alt={name}
                            loading="lazy"
                          />
                        ) : (
                          <div className="pp-carousel-img-fallback" />
                        )}
                      </div>

                      <div className="pp-carousel-body">
                        {store ? (
                          <div className="pp-carousel-store">{store}</div>
                        ) : null}
                        <div className="pp-carousel-name">{name}</div>

                        <div className="pp-carousel-price">
                          <div className="pp-carousel-now">
                            {fmtCurrency(s?.currency, s?.price)}
                          </div>
                          {s?.originalPrice ? (
                            <div className="pp-carousel-was">
                              {fmtCurrency(s?.currency, s?.originalPrice)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </a>
                ) : (
                  <Link className="pp-carousel-link" to={to}>
                    <div className="pp-carousel-card">
                      <div className="pp-carousel-media">
                        {discount ? (
                          <div className="pp-carousel-badge">-{discount}%</div>
                        ) : null}
                        {img ? (
                          <img
                            className="pp-carousel-img"
                            src={img}
                            alt={name}
                            loading="lazy"
                          />
                        ) : (
                          <div className="pp-carousel-img-fallback" />
                        )}
                      </div>

                      <div className="pp-carousel-body">
                        {store ? (
                          <div className="pp-carousel-store">{store}</div>
                        ) : null}
                        <div className="pp-carousel-name">{name}</div>

                        <div className="pp-carousel-price">
                          <div className="pp-carousel-now">
                            {fmtCurrency(s?.currency, s?.price)}
                          </div>
                          {s?.originalPrice ? (
                            <div className="pp-carousel-was">
                              {fmtCurrency(s?.currency, s?.originalPrice)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Carousel;
