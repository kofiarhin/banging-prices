import { useEffect, useMemo, useState } from "react";
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

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const [search, setSearch] = useState(params.get("search") || "");

  useEffect(() => {
    setSearch(params.get("search") || "");
    setIsSearchActive(false);
  }, [location.search, params]);

  const handleSearch = (e) => {
    e.preventDefault();
    const nextParams = new URLSearchParams(location.search);
    const q = search.trim();
    q ? nextParams.set("search", q) : nextParams.delete("search");
    nextParams.set("page", "1");
    navigate(`/products?${nextParams.toString()}`);
  };

  return (
    <header className={`phd-header ${isSearchActive ? "search-mode" : ""}`}>
      <div className="phd-header-container">
        <NavLink to="/" className="phd-logo">
          BangingPrices
        </NavLink>

        <form className="phd-search-form" onSubmit={handleSearch}>
          <div className="phd-search-field">
            <span className="phd-search-icon">
              <HeaderIcon name="search" />
            </span>
            <input
              className="phd-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fashion intelligence..."
              onFocus={() => setIsSearchActive(true)}
            />
            <div className="phd-kbd">⌘K</div>
            <button
              type="button"
              className="phd-search-exit"
              onClick={() => setIsSearchActive(false)}
              aria-label="Close search"
              title="Close search"
            >
              <HeaderIcon name="close" />
            </button>
          </div>
        </form>

        <div className="phd-actions">
          {/* Store (icon only) */}
          <NavLink
            to="/products"
            className="phd-btn-icon phd-icon-link"
            aria-label="Store"
            title="Store"
          >
            <HeaderIcon name="store" />
          </NavLink>

          {/* Mobile search icon only */}
          <button
            className="phd-btn-icon mobile-only"
            onClick={() => setIsSearchActive(true)}
            aria-label="Search"
            title="Search"
          >
            <HeaderIcon name="search" />
          </button>

          {/* Logged-in only */}
          <SignedIn>
            <button
              className="phd-btn-icon"
              onClick={() => navigate("/saved-products")}
              aria-label="Wishlist"
              title="Wishlist"
            >
              <HeaderIcon name="heart" />
            </button>
            <NavLink to="/dashboard" className="phd-nav-link">
              Dashboard
            </NavLink>

            <div className="phd-clerk-wrapper">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>

          {/* Logged-out only (icons) */}
          <SignedOut>
            <button
              className="phd-btn-icon phd-icon-link"
              onClick={() => navigate("/login")}
              aria-label="Log in"
              title="Log in"
            >
              <HeaderIcon name="login" />
            </button>

            <button
              className="phd-btn-icon phd-icon-link"
              onClick={() => navigate("/register")}
              aria-label="Register"
              title="Register"
            >
              <HeaderIcon name="register" />
            </button>
          </SignedOut>
        </div>
      </div>
    </header>
  );
};

export default Header;
