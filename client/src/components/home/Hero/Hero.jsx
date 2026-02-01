import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import "./hero.styles.scss";

const AUTOPLAY_MS = 2500;

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
          scrollRef.current.scrollTo({
            left: scrollRef.current.offsetWidth * next,
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

  if (isLoading || !data)
    return <div className="hero-skeleton">Scanning for drops…</div>;

  return (
    <section className="hero-container">
      <div className="hero-scroll-track" ref={scrollRef}>
        {data.carousel.slides.map((slide) => {
          const featured = slide?.items?.[0];
          if (!featured) return null;

          const href = getCategoryHref(slide, featured);

          return (
            <Link
              key={slide.key}
              to={href}
              className="hero-slide"
              onClick={stopAutoplay}
            >
              <div
                className="slide-image"
                style={{ backgroundImage: `url(${featured.image})` }}
              />

              {/* FULL-WIDTH OVERLAY */}
              <div className="hero-overlay">
                <div className="hero-overlay-inner">
                  <div className="content-box">
                    <span className="drop-badge">
                      {featured.discountPercent}% OFF — {featured.storeName}
                    </span>

                    <h2 className="display-title">
                      {slide.label}
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
                          navigate(href);
                        }}
                      >
                        View category
                      </button>

                      <span className="market-price">
                        RRP £{featured.originalPrice}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="system-pill">
        <span className="pulse-dot" />
        <p>
          {Number(data?.system?.assetsTracked || 0).toLocaleString()} ASSETS
          TRACKED
        </p>
      </div>

      <div className="nav-controls">
        <button
          type="button"
          className="ctrl-btn"
          onClick={() => scrollToIndex(currentIndex - 1)}
        >
          ‹
        </button>
        <button
          type="button"
          className="ctrl-btn"
          onClick={() => scrollToIndex(currentIndex + 1)}
        >
          ›
        </button>
      </div>
    </section>
  );
};

export default Hero;
