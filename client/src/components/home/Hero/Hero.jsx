import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./hero.styles.scss";

const AUTOPLAY_MS = 4200;

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const formatMoney = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Price tracked";
  return `GBP ${number.toLocaleString("en-GB")}`;
};

const getFeatured = (slide) => {
  if (Array.isArray(slide?.items)) return slide.items[0];
  if (Array.isArray(slide?.products)) return slide.products[0];
  return slide?.featured || slide?.product || null;
};

const Hero = ({
  q = "",
  setQ,
  onSearch,
  data,
  isLoading = false,
  isError = false,
  slides: incomingSlides = [],
  system = {},
}) => {
  const scrollRef = useRef(null);
  const timerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();

  const slides = useMemo(() => {
    const rawSlides = Array.isArray(incomingSlides)
      ? incomingSlides
      : Array.isArray(data?.carousel?.slides)
        ? data.carousel.slides
        : [];

    return rawSlides
      .map((slide) => ({ ...slide, featured: getFeatured(slide) }))
      .filter((slide) => slide.featured);
  }, [data, incomingSlides]);

  const slidesCount = slides.length;
  const assetsTracked =
    system?.assetsTracked || data?.system?.assetsTracked || 0;

  const getCategoryHref = (slide) => {
    const featured = slide?.featured;
    const rawCategory =
      featured?.category ||
      featured?.categoryName ||
      featured?.categorySlug ||
      slide?.category ||
      slide?.label ||
      "";

    const category = slugify(rawCategory);
    return category
      ? `/products?category=${encodeURIComponent(
          category,
        )}&sort=discount-desc&page=1`
      : "/products?sort=discount-desc&page=1";
  };

  const scrollToIndex = (index) => {
    if (!scrollRef.current || !slidesCount) return;
    const targetIndex = (index + slidesCount) % slidesCount;
    const width = scrollRef.current.offsetWidth;

    scrollRef.current.scrollTo({
      left: width * targetIndex,
      behavior: "smooth",
    });

    setCurrentIndex(targetIndex);
  };

  const stopAutoplay = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    stopAutoplay();
    if (!slidesCount || isPaused) return undefined;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % slidesCount;
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            left: scrollRef.current.offsetWidth * next,
            behavior: "smooth",
          });
        }
        return next;
      });
    }, AUTOPLAY_MS);

    return stopAutoplay;
  }, [slidesCount, isPaused]);

  useEffect(() => {
    const onVisibility = () => setIsPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (isLoading) {
    return (
      <section className="hero-container hero-container--loading">
        <div className="hero-skeleton-media" />
        <div className="hero-skeleton-copy">
          <span />
          <strong />
          <p />
          <p />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="hero-container hero-state">
        <p className="hero-state-kicker">Market feed unavailable</p>
        <h2>We could not load the current price-drop feed.</h2>
        <button type="button" onClick={() => window.location.reload()}>
          Retry feed
        </button>
      </section>
    );
  }

  if (!slidesCount) {
    return (
      <section className="hero-container hero-state">
        <p className="hero-state-kicker">No featured drops</p>
        <h2>Fresh drops will appear here after the next scan.</h2>
        <Link to="/products?sort=discount-desc&page=1">Browse products</Link>
      </section>
    );
  }

  return (
    <section
      className="hero-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="hero-topline">
        <div
          className="system-pill"
          aria-label={`${assetsTracked} products tracked`}
        >
          <span className="pulse-dot" />
          <p>{Number(assetsTracked).toLocaleString()} products tracked</p>
        </div>

        <div className="nav-controls" aria-label="Featured deal controls">
          <button
            type="button"
            className="ctrl-btn"
            onClick={() => scrollToIndex(currentIndex - 1)}
            aria-label="Previous featured deal"
          >
            <span aria-hidden="true">&lt;</span>
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={() => scrollToIndex(currentIndex + 1)}
            aria-label="Next featured deal"
          >
            <span aria-hidden="true">&gt;</span>
          </button>
        </div>
      </div>

      <div className="hero-scroll-track" ref={scrollRef}>
        {slides.map((slide, index) => {
          const featured = slide.featured;
          const href = getCategoryHref(slide);
          const title = featured?.title || slide?.label || "Featured drop";
          const store = featured?.storeName || featured?.store || "Tracked store";
          const discount = Number(featured?.discountPercent || 0);

          return (
            <Link
              key={slide.key || `${title}-${index}`}
              to={href}
              className="hero-slide"
              onClick={stopAutoplay}
            >
              <div className="hero-media-panel">
                <div
                  className="slide-image"
                  style={{ backgroundImage: `url(${featured.image})` }}
                  role="img"
                  aria-label={title}
                />
              </div>

              <div className="hero-copy-panel">
                <span className="drop-badge">
                  {discount > 0 ? `${discount}% off` : "Verified drop"} at{" "}
                  {store}
                </span>

                <h2 className="display-title">
                  {slide.label || "Featured drop"}
                </h2>

                <p className="featured-name">{title}</p>

                <div className="hero-price-row">
                  <span>
                    <small>Now</small>
                    {formatMoney(featured?.currentPrice || featured?.price)}
                  </span>
                  <span>
                    <small>Was</small>
                    {formatMoney(featured?.originalPrice)}
                  </span>
                </div>

                <button
                  type="button"
                  className="buy-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(href);
                  }}
                >
                  View deals
                </button>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hero-footer">
        <form className="hero-search" id="home-deal-search" onSubmit={onSearch}>
          <label htmlFor="hero-product-search">Find a price drop</label>
          <div className="hero-search-control">
            <input
              id="hero-product-search"
              type="search"
              value={q}
              onChange={(e) => setQ?.(e.target.value)}
              placeholder="Search trainers, coats, denim..."
            />
            <button type="submit">Search</button>
          </div>
        </form>

        <div className="hero-progress" aria-label="Featured deal position">
          {slides.map((slide, index) => (
            <button
              key={slide.key || `dot-${index}`}
              type="button"
              className={index === currentIndex ? "is-active" : ""}
              onClick={() => scrollToIndex(index)}
              aria-label={`Show featured deal ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
