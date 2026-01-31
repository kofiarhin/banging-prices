import { useEffect, useState } from "react";
import "./hero-headline.styles.scss";

const HeroHeadline = ({
  title = "Discover the biggest price drops",
  subtitle = "Refresh your wardrobe for less.",
  align = "center", // 'left' | 'center' | 'right'
  maxWidth = 980,
  animate = true,
  delay = 120,
}) => {
  const [isIn, setIsIn] = useState(!animate);
  const style = { textAlign: align, maxWidth };

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setIsIn(true), Math.max(0, delay));
    return () => clearTimeout(t);
  }, [animate, delay]);

  return (
    <section className="hero-headline" aria-label="Hero headline">
      <div
        className={`hero-headline-inner ${isIn ? "is-in" : ""}`}
        style={style}
      >
        <h1 className="hero-headline-title">{title}</h1>
        <p className="hero-headline-subtitle">{subtitle}</p>
      </div>
    </section>
  );
};

export default HeroHeadline;
