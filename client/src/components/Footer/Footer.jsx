import React from "react";
import "./footer.styles.scss";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <a href="/" className="footer-logo" aria-label="BangingPrices home">
              BangingPrices
            </a>
            <p className="footer-tagline">
              Real fashion price drops. Verified from live retailer data.
            </p>

            <div className="footer-badges" aria-label="Product highlights">
              <span className="footer-badge">
                <span className="material-symbols-outlined" aria-hidden="true">
                  timeline
                </span>
                Price history
              </span>
              <span className="footer-badge">
                <span className="material-symbols-outlined" aria-hidden="true">
                  notifications
                </span>
                Drop alerts
              </span>
              <span className="footer-badge">
                <span className="material-symbols-outlined" aria-hidden="true">
                  verified
                </span>
                Verified deals
              </span>
            </div>
          </div>

          <nav className="footer-nav" aria-label="Footer navigation">
            <div className="footer-col">
              <p className="footer-col-title">Explore</p>
              <a className="footer-link" href="/products">
                Shop
              </a>
              <a className="footer-link" href="/products?sort=newest">
                Newest drops
              </a>
              <a className="footer-link" href="/products?sort=discount">
                Biggest drops
              </a>
              <a className="footer-link" href="/tracked">
                Tracked
              </a>
            </div>

            <div className="footer-col">
              <p className="footer-col-title">Account</p>
              <a className="footer-link" href="/dashboard">
                Dashboard
              </a>
              <a className="footer-link" href="/saved">
                Saved
              </a>
              <a className="footer-link" href="/alerts">
                Alerts
              </a>
              <a className="footer-link" href="/settings">
                Settings
              </a>
            </div>

            <div className="footer-col">
              <p className="footer-col-title">Company</p>
              <a className="footer-link" href="/about">
                About
              </a>
              <a className="footer-link" href="/how-it-works">
                How it works
              </a>
              <a className="footer-link" href="/contact">
                Contact
              </a>
              <a className="footer-link" href="/status">
                Status
              </a>
            </div>
          </nav>

          <div className="footer-cta">
            <p className="footer-col-title">Get drop alerts</p>
            <p className="footer-cta-text">
              Weekly roundups + the biggest verified discounts.
            </p>

            <form
              className="footer-form"
              onSubmit={(e) => e.preventDefault()}
              aria-label="Newsletter signup"
            >
              <label className="footer-label" htmlFor="footer-email">
                Email
              </label>
              <div className="footer-input-row">
                <input
                  id="footer-email"
                  className="footer-input"
                  type="email"
                  placeholder="you@email.com"
                  autoComplete="email"
                />
                <button className="footer-btn" type="submit">
                  Subscribe
                </button>
              </div>
              <p className="footer-hint">No spam. Unsubscribe anytime.</p>
            </form>

            <div className="footer-social" aria-label="Social links">
              <a className="footer-icon-btn" href="/x" aria-label="X">
                <span className="material-symbols-outlined" aria-hidden="true">
                  public
                </span>
              </a>
              <a
                className="footer-icon-btn"
                href="/instagram"
                aria-label="Instagram"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  photo_camera
                </span>
              </a>
              <a className="footer-icon-btn" href="/tiktok" aria-label="TikTok">
                <span className="material-symbols-outlined" aria-hidden="true">
                  smart_display
                </span>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <span className="footer-muted">© {year} BangingPrices</span>
            <span className="footer-dot" aria-hidden="true">
              •
            </span>
            <a className="footer-muted-link" href="/privacy">
              Privacy
            </a>
            <span className="footer-dot" aria-hidden="true">
              •
            </span>
            <a className="footer-muted-link" href="/terms">
              Terms
            </a>
          </div>

          <div className="footer-bottom-right">
            <span className="footer-muted">
              Built for UK retailers • Live price monitoring
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
