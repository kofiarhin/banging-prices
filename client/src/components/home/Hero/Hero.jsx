import "./hero.styles.scss";

const Hero = ({
  title = "Only real price drops. Verified.",
  subtitle = "We scan UK retailers continuously, compare prices over time, and surface genuine drops — not inflated discounts.",
  primaryCta = { label: "Browse drops", href: "/shop" },
  secondaryCta = { label: "How it works", href: "/#how" },
  stats = [
    { label: "Retailers monitored", value: "2" },
    { label: "Products tracked", value: "2,445" },
    { label: "Last scan", value: "2m ago" },
    { label: "Verified drops today", value: "0" },
  ],
}) => {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-surface">
          <div className="hero-content">
            <div className="hero-badge" aria-label="Status">
              <span className="hero-badge-dot" />
              Live verification
            </div>

            <h1 className="hero-title">{title}</h1>
            <p className="hero-subtitle">{subtitle}</p>

            <div className="hero-actions">
              <a className="hero-btn hero-btn--primary" href={primaryCta.href}>
                {primaryCta.label}
              </a>
              <a className="hero-btn hero-btn--ghost" href={secondaryCta.href}>
                {secondaryCta.label}
              </a>
            </div>

            <div className="hero-stats" role="list">
              {stats.map((s) => (
                <div key={s.label} className="hero-stat" role="listitem">
                  <div className="hero-stat-value">{s.value}</div>
                  <div className="hero-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-panel" aria-hidden="true">
            <div className="hero-panel-top">
              <div className="hero-panel-pill">SCAN</div>
              <div className="hero-panel-pill">VERIFY</div>
              <div className="hero-panel-pill">SURFACE</div>
            </div>

            <div className="hero-panel-card">
              <div className="hero-panel-card-title">Verification pipeline</div>
              <div className="hero-panel-card-row">
                <span className="hero-panel-label">Fake “sale” patterns</span>
                <span className="hero-panel-chip">filtered</span>
              </div>
              <div className="hero-panel-card-row">
                <span className="hero-panel-label">Price history checks</span>
                <span className="hero-panel-chip">applied</span>
              </div>
              <div className="hero-panel-card-row">
                <span className="hero-panel-label">Genuine drops</span>
                <span className="hero-panel-chip hero-panel-chip--good">
                  live
                </span>
              </div>

              <div className="hero-panel-divider" />

              <div className="hero-panel-metric">
                <div className="hero-panel-metric-value">99%</div>
                <div className="hero-panel-metric-label">
                  noise removed from “discounts”
                </div>
              </div>
            </div>
          </div>

          <div className="hero-glow" aria-hidden="true" />
          <div className="hero-gridlines" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
