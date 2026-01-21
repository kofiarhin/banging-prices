import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import "./header.styles.scss";

const HeaderIcon = ({ name }) => {
  const icons = {
    search: <path d="M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z" />,
    heart: (
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 000-7.78z" />
    ),
    close: <path d="M18 6L6 18M6 6l12 12" />,
    store: (
      <>
        <path d="M3 9l1-5h16l1 5" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-7h6v7" />
      </>
    ),
    login: (
      <>
        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
      </>
    ),
    register: (
      <>
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <path d="M9 11a4 4 0 100-8 4 4 0 000 8z" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </>
    ),
    menu: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </>
    ),
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
      {icons[name]}
    </svg>
  );
};

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const searchInputRef = useRef(null);

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const [search, setSearch] = useState(params.get("search") || "");

  useEffect(() => {
    setSearch(params.get("search") || "");
  }, [location.search]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const isEsc = e.key === "Escape";

      if (isCmdK) {
        e.preventDefault();
        openSearch();
      }

      if (isEsc) {
        closeSearch();
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow =
      isMobileMenuOpen || isSearchActive ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen, isSearchActive]);

  const handleSearch = (e) => {
    e.preventDefault();
    const nextParams = new URLSearchParams(location.search);
    const q = search.trim();
    q ? nextParams.set("search", q) : nextParams.delete("search");
    nextParams.set("page", "1");
    setIsSearchActive(false);
    setIsMobileMenuOpen(false);
    navigate(`/products?${nextParams.toString()}`);
  };

  const openSearch = () => {
    setIsSearchActive(true);
    setIsMobileMenuOpen(false);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    searchInputRef.current?.blur();
  };

  return (
    <header
      className={[
        "phd-header",
        isSearchActive ? "search-mode" : "",
        isMobileMenuOpen ? "menu-open" : "",
      ].join(" ")}
    >
      <div className="phd-header-container">
        <NavLink to="/" className="phd-logo" aria-label="Home">
          BangingPrices
        </NavLink>

        <form className="phd-search-form" onSubmit={handleSearch}>
          <div className="phd-search-field">
            <span className="phd-search-icon" aria-hidden="true">
              <HeaderIcon name="search" />
            </span>

            <input
              ref={searchInputRef}
              className="phd-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              onFocus={() => setIsSearchActive(true)}
              aria-label="Search products"
            />

            <div className="phd-kbd" aria-hidden="true">
              ⌘K
            </div>

            <button
              type="button"
              className="phd-search-exit"
              onClick={closeSearch}
              aria-label="Close search"
              title="Close search"
            >
              <HeaderIcon name="close" />
            </button>
          </div>
        </form>

        <div className="phd-actions">
          <NavLink
            to="/products"
            className="phd-btn-icon phd-icon-link"
            aria-label="Store"
            title="Store"
          >
            <HeaderIcon name="store" />
          </NavLink>

          <SignedIn>
            <button
              className="phd-btn-icon desktop-only"
              onClick={() => navigate("/saved-products")}
              aria-label="Saved products"
              title="Saved products"
              type="button"
            >
              <HeaderIcon name="heart" />
            </button>

            {/* ✅ tracked items link (desktop) */}
            <NavLink to="/tracked" className="phd-nav-link desktop-only">
              Tracked
            </NavLink>

            <NavLink to="/dashboard" className="phd-nav-link desktop-only">
              Dashboard
            </NavLink>

            <div className="phd-clerk-wrapper desktop-only">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>

          <SignedOut>
            <button
              className="phd-btn-icon desktop-only"
              onClick={() => navigate("/login")}
              aria-label="Log in"
              title="Log in"
              type="button"
            >
              <HeaderIcon name="login" />
            </button>

            <button
              className="phd-btn-icon desktop-only"
              onClick={() => navigate("/register")}
              aria-label="Register"
              title="Register"
              type="button"
            >
              <HeaderIcon name="register" />
            </button>
          </SignedOut>

          <button
            className="phd-btn-icon mobile-only"
            onClick={openSearch}
            aria-label="Search"
            title="Search"
            type="button"
          >
            <HeaderIcon name="search" />
          </button>

          <button
            className="phd-btn-icon mobile-only"
            onClick={() => {
              setIsMobileMenuOpen((v) => !v);
              setIsSearchActive(false);
            }}
            aria-label="Menu"
            title="Menu"
            type="button"
          >
            <HeaderIcon name={isMobileMenuOpen ? "close" : "menu"} />
          </button>
        </div>
      </div>

      <div
        className={[
          "phd-overlay",
          isSearchActive || isMobileMenuOpen ? "show" : "",
        ].join(" ")}
        onClick={() => {
          setIsMobileMenuOpen(false);
          closeSearch();
        }}
        role="presentation"
      />

      <div
        className={["phd-mobile-drawer", isMobileMenuOpen ? "open" : ""].join(
          " ",
        )}
      >
        <div className="phd-mobile-drawer-inner">
          <NavLink to="/products" className="phd-drawer-link">
            Store
          </NavLink>

          <SignedIn>
            <NavLink to="/saved-products" className="phd-drawer-link">
              Saved products
            </NavLink>

            {/* ✅ tracked items link (mobile drawer) */}
            <NavLink to="/tracked" className="phd-drawer-link">
              Tracked items
            </NavLink>

            <NavLink to="/dashboard" className="phd-drawer-link">
              Dashboard
            </NavLink>

            <div className="phd-drawer-user">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>

          <SignedOut>
            <button
              className="phd-drawer-btn"
              onClick={() => navigate("/login")}
              type="button"
            >
              Log in
            </button>
            <button
              className="phd-drawer-btn phd-drawer-btn-primary"
              onClick={() => navigate("/register")}
              type="button"
            >
              Register
            </button>
          </SignedOut>
        </div>
      </div>
    </header>
  );
};

export default Header;
