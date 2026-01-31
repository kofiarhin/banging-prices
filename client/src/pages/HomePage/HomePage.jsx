return (
  <div className="pp-home">
    <div className="pp-container">
      {/* New Headline and Subtext */}
      <div className="hero-intro">
        <h1 className="hero-title">
          Discover Unbeatable Deals on Top Brands!
        </h1>
        <p className="hero-subtitle">
          Refresh your wardrobe with incredible savings and the latest styles.
        </p>
      </div>

      {/* Existing Hero Section */}
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

      {/* Existing Stats and Sections */}
      <Stats system={system} />

      <Sections
        sections={sections}
        isLoading={isLoading}
        isError={isError}
        loadingUI={<Spinner label="Loading live market feed…" size="md" />}
        errorUI={<div className="pp-home-error">Failed to load home feed.</div>}
        emptyUI={<div className="pp-home-empty">No sections available.</div>}
        getItemKey={(p) => p?._id}
        renderItem={(p) => <ProductCard product={p} />}
      />
    </div>
  </div>
);