import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import "./header.styles.scss";

import SideNav from "./SideNav/SideNav";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Icon = ({ name }) => {
  const paths = {
    search: "M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z",
    menu: "M4 6h16M4 12h16M4 18h16",
  };

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
};

const toLabel = (slug = "") =>
  String(slug || "")
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState("");
  const [navData, setNavData] = useState(null);

  const [activeMega, setActiveMega] = useState("");
  const [isMobileSearch, setIsMobileSearch] = useState(false);

  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [sideStack, setSideStack] = useState(["root"]);

  const megaTimer = useRef(null);
  const genders = useMemo(() => ["men", "women", "kids"], []);

  useEffect(() => {
    const fetchNav = async () => {
      try {
        const res = await fetch(`${API_URL}/api/home/nav`);
        const data = await res.json();
        setNavData(data);
      } catch (err) {
        console.error("Nav Fetch Error:", err);
        setNavData({
          topCategoriesByGender: { men: [], women: [], kids: [] },
          topStores: [],
        });
      }
    };
    fetchNav();
  }, []);

  // ✅ sync header input with URL q (deep links / refresh)
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const q = sp.get("q") || "";
    setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  useEffect(() => {
    setIsSideNavOpen(false);
    setSideStack(["root"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isSideNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [isSideNavOpen]);

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onTouchStart = (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      if (t.clientX > 24) return;
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    };

    const onTouchEnd = (e) => {
      if (!tracking) return;
      tracking = false;

      if (isSideNavOpen) return;

      const t = e.changedTouches?.[0];
      if (!t) return;

      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (Math.abs(dx) < 70) return;
      if (Math.abs(dy) > 90) return;

      if (dx > 70) {
        setIsMobileSearch(false);
        setIsSideNavOpen(true);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isSideNavOpen]);

  const goProducts = (url) => {
    navigate(url);
    setIsMobileSearch(false);
  };

  // ✅ standardize: use q only
  // ✅ preserve gender if already present in URL
  // ✅ clear category/store on new search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const term = String(search || "").trim();
    if (!term) return;

    const sp = new URLSearchParams(location.search);
    const gender = sp.get("gender") || "";

    const next = new URLSearchParams();
    if (gender) next.set("gender", gender);
    next.set("q", term);
    next.set("page", "1");

    goProducts(`/products?${next.toString()}`);
  };

  const onMouseEnter = (gender) => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    setActiveMega(gender);
  };

  const onMouseLeave = () => {
    megaTimer.current = setTimeout(() => setActiveMega(""), 150);
  };

  const renderMegaLinks = (gender) => {
    const categories = navData?.topCategoriesByGender?.[gender] || [];

    return (
      <div
        className={`phd-mega ${activeMega === gender ? "open" : ""}`}
        onMouseEnter={() => onMouseEnter(gender)}
        onMouseLeave={onMouseLeave}
      >
        <div className="phd-mega-cols">
          <div className="phd-mega-col">
            <div className="phd-mega-title">Selection</div>
            <button
              className="phd-mega-link"
              onClick={() => goProducts(`/products?gender=${gender}&page=1`)}
              type="button"
            >
              View All
            </button>
            <button
              className="phd-mega-link"
              onClick={() =>
                goProducts(`/products?gender=${gender}&sort=newest&page=1`)
              }
              type="button"
            >
              New Arrivals
            </button>
          </div>

          <div className="phd-mega-col">
            <div className="phd-mega-title">Categories</div>
            {categories.length ? (
              categories.map((cat) => (
                <button
                  key={cat}
                  className="phd-mega-link"
                  onClick={() =>
                    goProducts(
                      `/products?gender=${gender}&NavLink=${encodeURIComponent(
                        cat,
                      )}&page=1`,
                    )
                  }
                  type="button"
                >
                  {toLabel(cat)}
                </button>
              ))
            ) : (
              <div className="phd-mega-link phd-mega-muted">
                No categories yet
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const openSideNav = () => {
    setIsMobileSearch(false);
    setIsSideNavOpen(true);
  };

  const closeSideNav = () => {
    setIsSideNavOpen(false);
    setSideStack(["root"]);
  };

  return (
    <header className="phd-header">
      <div className="phd-main">
        {isMobileSearch && (
          <div
            className="phd-mobile-search-overlay"
            role="dialog"
            aria-modal="true"
          >
            <form
              onSubmit={handleSearchSubmit}
              className="phd-mobile-search-form"
            >
              <input
                autoFocus
                className="phd-input"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>

            <button
              onClick={() => setIsMobileSearch(false)}
              className="phd-tab phd-cancel"
              type="button"
            >
              CANCEL
            </button>
          </div>
        )}

        <div className="phd-left">
          <button
            className="phd-hamburger-btn"
            type="button"
            onClick={openSideNav}
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>

          <NavLink to="/" className="phd-logo">
            BANGINGPRICES
          </NavLink>

          <nav className="phd-tabs" aria-label="Shop categories">
            {genders.map((gender) => (
              <button
                key={gender}
                className={`phd-tab ${activeMega === gender ? "is-active" : ""}`}
                onMouseEnter={() => onMouseEnter(gender)}
                onMouseLeave={onMouseLeave}
                onClick={() => goProducts(`/products?gender=${gender}&page=1`)}
                type="button"
              >
                {gender.toUpperCase()}
              </button>
            ))}
          </nav>
        </div>

        <div className="phd-center desktop-only">
          <form className="phd-search-field" onSubmit={handleSearchSubmit}>
            <span className="phd-search-icon" aria-hidden="true">
              <Icon name="search" />
            </span>
            <input
              className="phd-input"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>

        <div className="phd-right">
          <button
            className="phd-mobile-search-btn"
            onClick={() => {
              setIsSideNavOpen(false);
              setSideStack(["root"]);
              setIsMobileSearch(true);
            }}
            aria-label="Search"
            type="button"
          >
            <Icon name="search" />
          </button>

          <SignedIn>
            <nav className="phd-auth-nav" aria-label="Account navigation">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `phd-auth-link ${isActive ? "is-active" : ""}`
                }
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/saved-products"
                className={({ isActive }) =>
                  `phd-auth-link ${isActive ? "is-active" : ""}`
                }
              >
                Saved
              </NavLink>

              <NavLink
                to="/tracked"
                className={({ isActive }) =>
                  `phd-auth-link ${isActive ? "is-active" : ""}`
                }
              >
                Tracked
              </NavLink>

              <NavLink to="/dashboard" className="phd-auth-cta">
                Generate
              </NavLink>
            </nav>

            <div className="phd-user">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>

          <SignedOut>
            <button
              className="phd-tab"
              onClick={() => navigate("/login")}
              type="button"
            >
              LOGIN
            </button>
          </SignedOut>
        </div>

        {renderMegaLinks("men")}
        {renderMegaLinks("women")}
        {renderMegaLinks("kids")}
      </div>

      <SideNav
        isOpen={isSideNavOpen}
        onClose={closeSideNav}
        navData={navData}
        onNavigate={goProducts}
        stack={sideStack}
        setStack={setSideStack}
      />
    </header>
  );
};

export default Header;
