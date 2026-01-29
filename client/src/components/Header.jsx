import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import "./header.styles.scss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Icon = ({ name }) => {
  const paths = {
    search: "M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z",
    close: "M18 6L6 18M6 6l12 12",
    menu: "M4 6h16M4 12h16M4 18h16",
    chevronRight: "M9 18l6-6-6-6",
    chevronLeft: "M15 18l-6-6 6-6",
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

  const [search, setSearch] = useState("");
  const [navData, setNavData] = useState(null);

  const [activeMega, setActiveMega] = useState("");
  const [isMobileSearch, setIsMobileSearch] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerView, setDrawerView] = useState("root"); // "root" | "gender"
  const [drawerGender, setDrawerGender] = useState(""); // men | women | kids

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
        setNavData({ topCategoriesByGender: { men: [], women: [], kids: [] } });
      }
    };
    fetchNav();
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeDrawer();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const openDrawer = () => {
    setDrawerOpen(true);
    setDrawerView("root");
    setDrawerGender("");
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerView("root");
    setDrawerGender("");
  };

  const openGenderSubnav = (gender) => {
    setDrawerGender(gender);
    setDrawerView("gender"); // ✅ drilldown, no navigation
  };

  const backToRoot = () => {
    setDrawerView("root");
    setDrawerGender("");
  };

  const goProducts = (url) => {
    navigate(url);
    closeDrawer();
    setIsMobileSearch(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    goProducts(`/products?search=${encodeURIComponent(search.trim())}&page=1`);
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
            >
              View All
            </button>
            <button
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
                  key={cat}
                  className="phd-mega-link"
                  onClick={() =>
                    goProducts(
                      `/products?gender=${gender}&category=${encodeURIComponent(
                        cat,
                      )}&page=1`,
                    )
                  }
                >
                  {toLabel(cat)}
                </button>
              ))
            ) : (
              <div className="phd-mega-link" style={{ opacity: 0.55 }}>
                No categories yet
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const drawerCategories = drawerGender
    ? navData?.topCategoriesByGender?.[drawerGender] || []
    : [];

  const drawerTitle = drawerView === "gender" ? toLabel(drawerGender) : "Menu";

  return (
    <header className="phd-header">
      <div className="phd-main">
        {/* Mobile Search Overlay */}
        {isMobileSearch && (
          <div className="phd-mobile-search-overlay">
            <form onSubmit={handleSearchSubmit}>
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
              className="phd-tab"
            >
              CANCEL
            </button>
          </div>
        )}

        <div className="phd-left">
          <button
            type="button"
            className="phd-menu-btn"
            onClick={openDrawer}
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>

          <NavLink to="/" className="phd-logo">
            BANGINGPRICES
          </NavLink>

          {/* desktop tabs */}
          <nav className="phd-tabs">
            {genders.map((gender) => (
              <button
                key={gender}
                className={`phd-tab ${activeMega === gender ? "is-active" : ""}`}
                onMouseEnter={() => onMouseEnter(gender)}
                onMouseLeave={onMouseLeave}
                onClick={() => goProducts(`/products?gender=${gender}&page=1`)}
              >
                {gender.toUpperCase()}
              </button>
            ))}
          </nav>
        </div>

        <div className="phd-center desktop-only">
          <form className="phd-search-field" onSubmit={handleSearchSubmit}>
            <Icon name="search" />
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
            onClick={() => setIsMobileSearch(true)}
            aria-label="Search"
          >
            <Icon name="search" />
          </button>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          <SignedOut>
            <button className="phd-tab" onClick={() => navigate("/login")}>
              LOGIN
            </button>
          </SignedOut>
        </div>

        {/* Desktop mega menus */}
        {renderMegaLinks("men")}
        {renderMegaLinks("women")}
        {renderMegaLinks("kids")}
      </div>

      {/* Fullscreen Mobile Drawer (Drilldown) */}
      <div className={`phd-drawer ${drawerOpen ? "open" : ""}`}>
        <div className="phd-drawer-surface" role="dialog" aria-modal="true">
          <div className="phd-drawer-top">
            {drawerView === "gender" ? (
              <button
                type="button"
                className="phd-drawer-iconbtn"
                onClick={backToRoot}
                aria-label="Back"
              >
                <Icon name="chevronLeft" />
              </button>
            ) : (
              <div className="phd-drawer-spacer" />
            )}

            <div className="phd-drawer-title">{drawerTitle}</div>

            <button
              type="button"
              className="phd-drawer-iconbtn"
              onClick={closeDrawer}
              aria-label="Close menu"
            >
              <Icon name="close" />
            </button>
          </div>

          <div className="phd-drawer-body">
            <form className="phd-drawer-search" onSubmit={handleSearchSubmit}>
              <Icon name="search" />
              <input
                className="phd-input"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>

            {/* ROOT: genders list only (no nav) */}
            {drawerView === "root" && (
              <div className="phd-drawer-list">
                {genders.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className="phd-drawer-item"
                    onClick={() => openGenderSubnav(g)}
                  >
                    <span className="phd-drawer-itemtext">{toLabel(g)}</span>
                    <Icon name="chevronRight" />
                  </button>
                ))}

                <button
                  type="button"
                  className="phd-drawer-item"
                  onClick={() => goProducts(`/products?page=1`)}
                >
                  <span className="phd-drawer-itemtext">All Products</span>
                  <Icon name="chevronRight" />
                </button>
              </div>
            )}

            {/* SUB NAV: gender categories (links live here) */}
            {drawerView === "gender" && (
              <div className="phd-drawer-list">
                <button
                  type="button"
                  className="phd-drawer-item"
                  onClick={() =>
                    goProducts(`/products?gender=${drawerGender}&page=1`)
                  }
                >
                  <span className="phd-drawer-itemtext">View All</span>
                  <Icon name="chevronRight" />
                </button>

                <button
                  type="button"
                  className="phd-drawer-item"
                  onClick={() =>
                    goProducts(
                      `/products?gender=${drawerGender}&sort=newest&page=1`,
                    )
                  }
                >
                  <span className="phd-drawer-itemtext">New Arrivals</span>
                  <Icon name="chevronRight" />
                </button>

                {drawerCategories.length ? (
                  drawerCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className="phd-drawer-item"
                      onClick={() =>
                        goProducts(
                          `/products?gender=${drawerGender}&category=${encodeURIComponent(
                            cat,
                          )}&page=1`,
                        )
                      }
                    >
                      <span className="phd-drawer-itemtext">
                        {toLabel(cat)}
                      </span>
                      <Icon name="chevronRight" />
                    </button>
                  ))
                ) : (
                  <div className="phd-drawer-empty">No categories yet</div>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          className="phd-drawer-backdrop"
          onClick={closeDrawer}
          aria-label="Close drawer"
        />
      </div>
    </header>
  );
};

export default Header;
