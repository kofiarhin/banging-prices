import "./hero.styles.scss";

const Hero = ({ q, setQ, onSearch }) => {
  return (
    <section className="pp-hero">
      <div className="pp-hero-inner">
        <div className="pp-hero-copy">
          <div className="pp-hero-kicker">
            <span className="pp-hero-dot" />
            LIVE MARKET TRACKING
          </div>

          <h1 className="pp-hero-title">
            Real fashion price drops.
            <br />
            <span className="pp-hero-accent">
              Tracked live across UK retailers.
            </span>
          </h1>

          <p className="pp-hero-subtitle">
            We monitor real prices in real time to surface only genuine drops —
            not sale labels or promo noise.
          </p>

          <form className="pp-hero-search" onSubmit={onSearch}>
            <div className="pp-hero-searchbar">
              <span className="pp-hero-searchicon" aria-hidden="true">
                ⌕
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a product or brand..."
                aria-label="Search products"
              />
            </div>

            <button className="pp-hero-searchbtn" type="submit">
              ↗
            </button>
          </form>
        </div>

        <div className="pp-hero-right" />
      </div>
    </section>
  );
};

export default Hero;
