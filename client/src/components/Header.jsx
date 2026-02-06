import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

import "./header.styles.scss";
import SideNav from "./SideNav/SideNav";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Icon = ({ name }) => {
  const paths = {
    search: "M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z",
    menu: "M4 6h16M4 12h16M4 18h16",
  };

  const d = paths[name];
  if (!d) return null;

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
    >
      <path d={d} />
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

  // sync header input with URL q (deep links / refresh)
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
    setActiveMega("");
    setIsSideNavOpen(false);
    setSideStack(["root"]);
    setIsMobileSearch(false);
    navigate(url);
  };

  // standardize: use q only
  // preserve gender if already present in URL
  // clear category/store on new search
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
              type="button"
              className="phd-mega-link"
              onClick={() => goProducts(`/products?gender=${gender}&page=1`)}
            >
              View All
            </button>
            <button
              type="button"
              className="phd-mega-link"
              onClick={() =>
                goProducts(`/products?gender=${gender}&sort=newest&page=1`)
              }
            >
              New Arrivals
            </button>
          </div>

          <div className="phd-mega-col">
            <div className="phd-mega-title">Categories</div>

            {categories.length ? (
              categories.map((cat) => (
                <button
                  key={`${gender}-${cat}`}
                  type="button"
                  className="phd-mega-link"
                  onClick={() =>
                    goProducts(
<<<<<<< HEAD
                      `/products?gender=${gender}&NavLink=${encodeURIComponent(
                        cat,
                      )}&page=1`,
=======
                      `/products?gender=${gender}&category=${encodeURIComponent(cat)}&page=1`,
>>>>>>> dev
                    )
                  }
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
          <div className="phd-mobile-search-overlay">
            <form
              className="phd-mobile-search-form"
              onSubmit={handleSearchSubmit}
            >
              <div className="phd-search-field">
                <span className="phd-search-icon">
                  <Icon name="search" />
                </span>
                <input
                  className="phd-input"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </form>

            <button
              className="phd-tab phd-cancel"
              type="button"
              onClick={() => setIsMobileSearch(false)}
            >
              CANCEL
            </button>
          </div>
        )}

        <div className="phd-left">
          <button
            className="phd-hamburger-btn"
            aria-label="Open menu"
            type="button"
            onClick={openSideNav}
          >
            <Icon name="menu" />
          </button>

          <NavLink className="phd-logo" to="/">
            BANGINGPRICES
          </NavLink>

          <div className="phd-tabs">
            {genders.map((gender) => (
              <button
                key={gender}
                type="button"
                className={`phd-tab ${activeMega === gender ? "is-active" : ""}`}
                onMouseEnter={() => onMouseEnter(gender)}
                onMouseLeave={onMouseLeave}
                onClick={() => goProducts(`/products?gender=${gender}&page=1`)}
              >
                {gender.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="phd-center desktop-only">
          <form className="phd-search-field" onSubmit={handleSearchSubmit}>
            <span className="phd-search-icon">
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
            aria-label="Search"
            type="button"
            onClick={() => {
              setIsSideNavOpen(false);
              setSideStack(["root"]);
              setIsMobileSearch(true);
            }}
          >
            <Icon name="search" />
          </button>

          <SignedIn>
<<<<<<< HEAD
            <nav className="phd-auth-nav" aria-label="Account navigation">
=======
            <nav className="phd-auth-nav">
>>>>>>> dev
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `phd-auth-link ${isActive ? "is-active" : ""}`
                }
              >
                Dashboard
              </NavLink>
<<<<<<< HEAD

=======
>>>>>>> dev
              <NavLink
                to="/saved-products"
                className={({ isActive }) =>
                  `phd-auth-link ${isActive ? "is-active" : ""}`
                }
              >
                Saved
              </NavLink>
<<<<<<< HEAD

=======
>>>>>>> dev
              <NavLink
                to="/tracked"
                className={({ isActive }) =>
                  `phd-auth-link ${isActive ? "is-active" : ""}`
                }
              >
                Tracked
              </NavLink>
<<<<<<< HEAD

              <NavLink to="/dashboard" className="phd-auth-cta">
=======
              <NavLink to="/generate" className="phd-auth-cta">
>>>>>>> dev
                Generate
              </NavLink>
            </nav>

            <div className="phd-user">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>

          <SignedOut>
            <button
              className="phd-auth-cta"
              type="button"
              onClick={() => navigate("/login")}
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
