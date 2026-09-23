import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
      <section className="relative w-full max-w-7xl mx-auto rounded-2xl bg-gray-900 border border-gray-800 p-6 md:p-8 min-h-[420px] flex flex-col md:flex-row gap-8 animate-pulse overflow-hidden">
        <div className="w-full md:w-1/2 min-h-[260px] bg-gray-800 rounded-xl" />
        <div className="w-full md:w-1/2 flex flex-col justify-center space-y-4">
          <span className="h-4 w-28 bg-gray-800 rounded-full" />
          <strong className="h-8 w-3/4 bg-gray-800 rounded-lg" />
          <p className="h-4 w-full bg-gray-800 rounded" />
          <p className="h-4 w-2/3 bg-gray-800 rounded" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="relative w-full max-w-7xl mx-auto rounded-2xl bg-gray-900 border border-red-900/50 p-8 text-center flex flex-col items-center justify-center min-h-[360px]">
        <p className="text-xs uppercase tracking-widest text-red-400 font-semibold mb-2">
          Market feed unavailable
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
          We could not load the current price-drop feed.
        </h2>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
        >
          Retry feed
        </button>
      </section>
    );
  }

  if (!slidesCount) {
    return (
      <section className="relative w-full max-w-7xl mx-auto rounded-2xl bg-gray-900 border border-gray-800 p-8 text-center flex flex-col items-center justify-center min-h-[360px]">
        <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mb-2">
          No featured drops
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
          Fresh drops will appear here after the next scan.
        </h2>
        <Link
          to="/products?sort=discount-desc&page=1"
          className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold transition-colors"
        >
          Browse products
        </Link>
      </section>
    );
  }

  return (
    <section
      className="relative w-full max-w-7xl mx-auto rounded-2xl bg-gray-900 border border-gray-800 p-4 md:p-8 flex flex-col gap-6 shadow-2xl overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between gap-4">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/80 border border-gray-700/60 text-xs text-gray-300"
          aria-label={`${assetsTracked} products tracked`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <p className="font-medium">
            {Number(assetsTracked).toLocaleString()} products tracked
          </p>
        </div>

        <div className="flex items-center gap-2" aria-label="Featured deal controls">
          <button
            type="button"
            className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
            onClick={() => scrollToIndex(currentIndex - 1)}
            aria-label="Previous featured deal"
          >
            <span aria-hidden="true">&lt;</span>
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
            onClick={() => scrollToIndex(currentIndex + 1)}
            aria-label="Next featured deal"
          >
            <span aria-hidden="true">&gt;</span>
          </button>
        </div>
      </div>

      <div
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth rounded-xl"
        ref={scrollRef}
      >
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
              className="w-full flex-shrink-0 snap-start grid grid-cols-1 md:grid-cols-2 gap-6 p-4 md:p-6 bg-gray-950/50 rounded-xl border border-gray-800 hover:border-gray-700 transition-all group"
              onClick={stopAutoplay}
            >
              <div className="w-full min-h-[240px] md:min-h-[320px] rounded-lg overflow-hidden bg-gray-800 relative">
                <div
                  className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${featured.image})` }}
                  role="img"
                  aria-label={title}
                />
              </div>

              <div className="flex flex-col justify-center items-start gap-3">
                <span className="inline-block px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {discount > 0 ? `${discount}% off` : "Verified drop"} at{" "}
                  {store}
                </span>

                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  {slide.label || "Featured drop"}
                </h2>

                <p className="text-sm md:text-base text-gray-400 line-clamp-2">
                  {title}
                </p>

                <div className="flex items-center gap-6 my-2">
                  <span className="flex flex-col">
                    <small className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                      Now
                    </small>
                    <strong className="text-xl md:text-2xl font-bold text-white">
                      {formatMoney(featured?.currentPrice || featured?.price)}
                    </strong>
                  </span>
                  <span className="flex flex-col">
                    <small className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                      Was
                    </small>
                    <span className="text-sm md:text-base text-gray-500 line-through">
                      {formatMoney(featured?.originalPrice)}
                    </span>
                  </span>
                </div>

                <button
                  type="button"
                  className="mt-2 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold transition-all transform active:scale-95"
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

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
        <form
          className="w-full md:w-auto flex-1 max-w-md"
          id="home-deal-search"
          onSubmit={onSearch}
        >
          <label htmlFor="hero-product-search" className="sr-only">
            Find a price drop
          </label>
          <div className="relative flex items-center">
            <input
              id="hero-product-search"
              type="search"
              value={q}
              onChange={(e) => setQ?.(e.target.value)}
              placeholder="Search trainers, coats, denim..."
              className="w-full pl-4 pr-24 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1 px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-xs font-bold transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        <div className="flex items-center gap-2" aria-label="Featured deal position">
          {slides.map((slide, index) => (
            <button
              key={slide.key || `dot-${index}`}
              type="button"
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "w-8 bg-emerald-500"
                  : "w-2 bg-gray-700 hover:bg-gray-600"
              }`}
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