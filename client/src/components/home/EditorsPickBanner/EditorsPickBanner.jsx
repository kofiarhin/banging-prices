import { Link } from "react-router-dom";
import "./editors-pick-banner.styles.scss";

const EditorsPickBanner = ({
  kicker = "EDITOR'S PICK",
  title = "This week’s steals: Jackets",
  subtitle = "Winter-ready layers with verified drops — updated daily.",
  ctaLabel = "View deals →",
  to = "/products?category=jackets&sort=discount-desc&page=1",
  imageUrl = "",
  align = "left",
}) => {
  return (
    <section className="editors-pick" aria-label="Editors pick">
      <Link
        className={`editors-pick-inner editors-pick-align-${align}`}
        to={to}
        aria-label={`${title}. ${ctaLabel}`}
      >
        <div
          className="editors-pick-media"
          style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
          aria-hidden="true"
        />

        <div className="editors-pick-scrim" aria-hidden="true" />

        <div className="editors-pick-content">
          <div className="editors-pick-kicker">{kicker}</div>

          <h2 className="editors-pick-title">{title}</h2>

          {subtitle ? (
            <p className="editors-pick-subtitle">{subtitle}</p>
          ) : null}

          <div className="editors-pick-cta-row">
            <span className="editors-pick-cta">{ctaLabel}</span>
            <span className="editors-pick-hint">Browse category</span>
          </div>
        </div>

        <div className="editors-pick-glow" aria-hidden="true" />
      </Link>
    </section>
  );
};

export default EditorsPickBanner;
