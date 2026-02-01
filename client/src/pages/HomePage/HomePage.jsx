import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHomeQuery } from "../../hooks/useHomeQuery";

import Hero from "../../components/home/Hero/Hero";
import HeroHeadline from "../../components/home/HeroHeadline/HeroHeadline";
// import HowItWorks from "../../components/home/HowItWorks/HowItWorks";
import Stats from "../../components/home/Stats/Stats";
import Sections from "../../components/Sections/Sections";
import ProductCard from "../../components/cards/ProductCard";

import Spinner from "../../components/Spinner/Spinner";

import "./home-page.styles.scss";

const safeTo = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return "/products?page=1";
  if (/^https?:\/\//i.test(s)) return "/products?page=1";
  if (s.startsWith("/")) return s;
  if (s.startsWith("?")) return `/products${s}`;
  if (s.startsWith("products")) return `/${s}`;
  return "/products?page=1";
};

const hasCategory = (to = "") => /[?&]category=/.test(String(to));
const hasSort = (to = "") => /[?&]sort=/.test(String(to));
const hasPage = (to = "") => /[?&]page=/.test(String(to));

const withDefaults = (to = "") => {
  const s = safeTo(to);
  const join = s.includes("?") ? "&" : "?";
  let out = s;

  if (!hasSort(out)) out += `${join}sort=discount-desc`;
  if (!hasPage(out)) out += `${out.includes("?") ? "&" : "?"}page=1`;

  return out;
};

const HomePage = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useHomeQuery();
  const [q, setQ] = useState("");

  const system = data?.system || {};
  const sections = Array.isArray(data?.sections) ? data.sections : [];

  const slides = useMemo(() => {
    if (Array.isArray(data?.heroCarousel)) return data.heroCarousel;
    if (Array.isArray(data?.carousel?.slides)) return data.carousel.slides;
    if (Array.isArray(data?.carousel)) return data.carousel;
    return [];
  }, [data]);

  const onSearch = (e) => {
    e.preventDefault();
    const query = String(q || "").trim();
    if (!query) return;
    navigate(`/products?search=${encodeURIComponent(query)}&page=1`);
  };

  const tickerItems = useMemo(() => {
    // Prefer API slides if they contain category routes; otherwise fallback.
    if (slides && slides.length) {
      const mapped = slides
        .map((s) => ({
          label: s.label,
          to: safeTo(s.to),
        }))
        .filter((x) => x.label && x.to);

      const categoryOnes = mapped.filter((x) => hasCategory(x.to));
      if (categoryOnes.length) {
        return categoryOnes.map((x) => ({
          label: x.label,
          to: withDefaults(x.to),
        }));
      }
    }

    // Fallback: category-first links (best for "hot right now")
    return [
      {
        label: "Hoodies",
        to: "/products?category=hoodies-sweatshirts&sort=discount-desc&page=1",
      },
      {
        label: "Coats & Jackets",
        to: "/products?category=coats-and-jackets&sort=discount-desc&page=1",
      },
      {
        label: "Trainers",
        to: "/products?category=trainers&sort=discount-desc&page=1",
      },
      {
        label: "Jeans",
        to: "/products?category=jeans&sort=discount-desc&page=1",
      },
      {
        label: "T-Shirts",
        to: "/products?category=t-shirts-vests&sort=discount-desc&page=1",
      },
      {
        label: "Bags",
        to: "/products?category=bags&sort=discount-desc&page=1",
      },
    ];
  }, [slides]);

  return (
    <div className="pp-home">
      <div className="pp-container">
        <section className="pp-home-hero">
          <HeroHeadline
            title="Discover the biggest price drops"
            subtitle="Refresh your wardrobe for less."
            align="left"
            tickerLabel="WHAT'S HOT RIGHT NOW"
            tickerItems={tickerItems}
            tickerSpeed={26}
          />

          <Hero
            q={q}
            setQ={setQ}
            onSearch={onSearch}
            data={data}
            isLoading={isLoading}
            slides={slides}
            system={system}
          />
        </section>

        <Stats system={system} />

        <Sections
          sections={sections}
          isLoading={isLoading}
          isError={isError}
          loadingUI={<Spinner label="Loading live market feed…" size="md" />}
          errorUI={
            <div className="pp-home-error">Failed to load home feed.</div>
          }
          emptyUI={<div className="pp-home-empty">No sections available.</div>}
          getItemKey={(p) => p?._id}
          renderItem={(p) => <ProductCard product={p} />}
        />
      </div>
    </div>
  );
};

export default HomePage;
