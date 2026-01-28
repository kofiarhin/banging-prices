import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHomeQuery } from "../../hooks/useHomeQuery";

import Hero from "../../components/home/Hero/Hero";
// import HowItWorks from "../../components/home/HowItWorks/HowItWorks";
import Stats from "../../components/home/Stats/Stats";
import Sections from "../../components/Sections/Sections";
import ProductCard from "../../components/cards/ProductCard";

import "./home-page.styles.scss";

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

  return (
    <div className="pp-home">
      <div className="pp-container">
        <section className="pp-home-hero">
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
          loadingUI={
            <div className="pp-home-loading">Loading live market feed…</div>
          }
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
