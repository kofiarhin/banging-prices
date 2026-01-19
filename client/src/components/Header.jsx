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
            >
              <HeaderIcon name="close" />
            </button>
          </div>
        </form>

        <div className="phd-actions">
          {/* Public link */}
          <NavLink to="/products" className="phd-store-link">
            Store
          </NavLink>

          {/* Mobile search icon only */}
          <button
            className="phd-btn-icon mobile-only"
            onClick={() => setIsSearchActive(true)}
          >
            <HeaderIcon name="search" />
          </button>

          {/* Logged-in only links */}
          <SignedIn>
            <NavLink to="/dashboard" className="phd-nav-link">
              Dashboard
            </NavLink>

            <button
              className="phd-btn-icon"
              onClick={() => navigate("/products")}
            >
              <HeaderIcon name="heart" />
            </button>

            <div className="phd-clerk-wrapper">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>

          {/* Logged-out only */}
          <SignedOut>
            <button
              className="phd-auth-link"
              onClick={() => navigate("/login")}
            >
              Log in
            </button>
            <button
              className="phd-auth-btn"
              onClick={() => navigate("/register")}
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
