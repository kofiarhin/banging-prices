import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHomeQuery } from "../../hooks/useHomeQuery";

import Hero from "../../components/home/Hero/Hero";
import HeroHeadline from "../../components/home/HeroHeadline/HeroHeadline";
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
    const cats = new Map();
    const rawSections = Array.isArray(data?.sections) ? data.sections : [];

    rawSections.forEach((sec) => {
      const items = Array.isArray(sec?.items)
        ? sec.items
        : Array.isArray(sec?.products)
          ? sec.products
          : [];

      items.forEach((p) => {
        const label =
          p?.categoryLabel ||
          p?.categoryName ||
          p?.categoryTitle ||
          p?.category ||
          p?.categorySlug ||
          "";

        const slug = p?.categorySlug || p?.category || "";

        const cleanLabel = String(label || "").trim();
        const cleanSlug = String(slug || "").trim();

        if (!cleanLabel || !cleanSlug) return;

        if (!cats.has(cleanSlug)) {
          cats.set(cleanSlug, {
            label: cleanLabel,
            to: `/products?category=${encodeURIComponent(
              cleanSlug,
            )}&sort=discount-desc&page=1`,
          });
        }
      });
    });

    if (!cats.size && slides?.length) {
      slides
        .map((s) => ({ label: s?.label, to: safeTo(s?.to) }))
        .filter((x) => x.label && x.to && hasCategory(x.to))
        .forEach((x) => {
          const to = withDefaults(x.to);
          const match = to.match(/[?&]category=([^&]+)/);
          const slug = match?.[1];
          if (!slug) return;

          if (!cats.has(slug)) {
            cats.set(slug, { label: x.label, to });
          }
        });
    }

    return Array.from(cats.values()).slice(0, 18);
  }, [data, slides]);

  return (
    <div className="pp-home">
      <div className="pp-container">
        <section className="pp-home-hero">
          {/* ✅ MERGED HERO + STATS */}
          <HeroHeadline
            title="The biggest price drops, tracked in real time"
            subtitle="Live price tracking across thousands of products."
            align="left"
            tickerLabel="TRENDING NOW"
            tickerItems={tickerItems}
            tickerSpeed={32}
          >
            <Stats system={system} />
          </HeroHeadline>

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
