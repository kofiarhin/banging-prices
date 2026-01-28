import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import "./hero.styles.scss";

const AUTOPLAY_MS = 5000;

const Hero = () => {
  const scrollRef = useRef(null);
  const timerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

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

        // scroll immediately using the DOM ref (avoid stale closures)
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

  // start/stop autoplay when data loads or pause toggles
  useEffect(() => {
    startAutoplay();
    return stopAutoplay;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slidesCount, isPaused]);

  // pause when tab is hidden
  useEffect(() => {
    const onVisibility = () => setIsPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // keep slide aligned on resize
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

          return (
            <div className="hero-slide" key={slide.key}>
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
                    <button className="buy-btn">
                      SECURE DROP — £{featured.price}
                    </button>
                    <span className="market-price">
                      RRP £{featured.originalPrice}
                    </span>
                  </div>
                </div>
              </div>
            </div>
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
          onClick={() => {
            setIsPaused(true);
            scrollToIndex(currentIndex - 1);
            setTimeout(() => setIsPaused(false), 600);
          }}
          className="ctrl-btn"
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
          onClick={() => {
            setIsPaused(true);
            scrollToIndex(currentIndex + 1);
            setTimeout(() => setIsPaused(false), 600);
          }}
          className="ctrl-btn"
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
