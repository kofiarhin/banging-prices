import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import "./hero.styles.scss";

const AUTOPLAY_MS = 2500; // ✅ was 5000

const Hero = () => {
  const scrollRef = useRef(null);
  const timerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const navigate = useNavigate();

  const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

  const { data, isLoading } = useQuery({
    queryKey: ["homeData"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/home`);
      if (!res.ok) throw new Error("Failed to load home data");
      return res.json();
    },
  });

  const slidesCount = data?.carousel?.slides?.length || 0;

  const slugify = (value = "") =>
    String(value)
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  const getCategoryHref = (slide, featured) => {
    const rawCategory =
      featured?.category ||
      featured?.categoryName ||
      slide?.category ||
      slide?.label ||
      "";

    const category = slugify(rawCategory);

    return category
      ? `/products?category=${encodeURIComponent(category)}`
      : "/products";
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

  const startAutoplay = () => {
    stopAutoplay();
    if (!slidesCount || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % slidesCount;

        if (scrollRef.current) {
          const width = scrollRef.current.offsetWidth;
          scrollRef.current.scrollTo({
            left: width * next,
            behavior: "smooth",
          });
        }

        return next;
      });
    }, AUTOPLAY_MS);
  };

  useEffect(() => {
    startAutoplay();
    return stopAutoplay;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slidesCount, isPaused]);

  useEffect(() => {
    const onVisibility = () => setIsPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const onResize = () => scrollToIndex(currentIndex);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, slidesCount]);

  if (isLoading || !data)
    return <div className="hero-skeleton">Scanning for drops...</div>;

  return (
    <section className="hero-container">
      <div
        className="hero-scroll-track"
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {data.carousel.slides.map((slide) => {
          const featured = slide?.items?.[0];
          if (!featured) return null;

          const href = getCategoryHref(slide, featured);

          return (
            <Link
              key={slide.key}
              to={href}
              className="hero-slide"
              onClick={() => stopAutoplay()}
              aria-label={`View category: ${
                slide?.label || featured?.category || "Products"
              }`}
            >
              <div
                className="slide-image"
                style={{ backgroundImage: `url(${featured.image})` }}
              />
              <div className="slide-overlay">
                <div className="content-box">
                  <span className="drop-badge">
                    {featured.discountPercent}% OFF — {featured.storeName}
                  </span>

                  <h2 className="display-title">
                    {slide.label}
                    <br />
                    <span className="sub-accent">
                      {String(featured.title || "")
                        .split(" ")
                        .slice(0, 2)
                        .join(" ")}
                    </span>
                  </h2>

                  <div className="action-row">
                    <button
                      type="button"
                      className="buy-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        stopAutoplay();
                        navigate(href);
                      }}
                    >
                      VIEW CATEGORY — {slide.label}
                    </button>

                    <span className="market-price">
                      RRP £{featured.originalPrice}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="system-pill">
        <span className="pulse-dot"></span>
        <p>
          {Number(data?.system?.assetsTracked || 0).toLocaleString()} ASSETS
          TRACKED
        </p>
      </div>

      <div className="nav-controls">
        <button
          type="button"
          onClick={() => {
            setIsPaused(true);
            scrollToIndex(currentIndex - 1);
            setTimeout(() => setIsPaused(false), 400);
          }}
          className="ctrl-btn"
          aria-label="Previous slide"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsPaused(true);
            scrollToIndex(currentIndex + 1);
            setTimeout(() => setIsPaused(false), 400);
          }}
          className="ctrl-btn"
          aria-label="Next slide"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </section>
  );
};

export default Hero;
