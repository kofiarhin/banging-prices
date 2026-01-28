import React, { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import "./hero.styles.scss";

const Hero = () => {
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

  const { data, isLoading } = useQuery({
    queryKey: ["homeData"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/home`);
      if (!res.ok) throw new Error("Failed to load home data");
      return res.json();
    },
  });

  const scrollToIndex = (index) => {
    if (!scrollRef.current || !data?.carousel?.slides?.length) return;

    const slides = data.carousel.slides;
    const targetIndex = (index + slides.length) % slides.length;

    const width = scrollRef.current.offsetWidth;
    scrollRef.current.scrollTo({
      left: width * targetIndex,
      behavior: "smooth",
    });

    setCurrentIndex(targetIndex);
  };

  if (isLoading || !data)
    return <div className="hero-skeleton">Scanning for drops...</div>;

  return (
    <section className="hero-container">
      <div className="hero-scroll-track" ref={scrollRef}>
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
          onClick={() => scrollToIndex(currentIndex - 1)}
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
          onClick={() => scrollToIndex(currentIndex + 1)}
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
