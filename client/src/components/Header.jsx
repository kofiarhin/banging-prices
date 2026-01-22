import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, UserButton, useClerk } from "@clerk/clerk-react";
import "./header.styles.scss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
    chevronDown: <path d="M6 9l6 6 6-6" />,
    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 3h-6a2 2 0 00-2 2v3" />
        <path d="M13 16v3a2 2 0 002 2h6" />
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

const safeArr = (v) => (Array.isArray(v) ? v : []);

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useClerk();

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [navData, setNavData] = useState(null);
  const [navLoading, setNavLoading] = useState(false);

  const [activeGender, setActiveGender] = useState("");
  const [drawerCatsOpen, setDrawerCatsOpen] = useState(true);
  const [drawerStoresOpen, setDrawerStoresOpen] = useState(false);

  const searchInputRef = useRef(null);

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const [search, setSearch] = useState(params.get("search") || "");

  const isDashboardRoute =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/tracked") ||
    location.pathname.startsWith("/saved-products");

  useEffect(() => {
    setSearch(params.get("search") || "");
  }, [location.search]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const isEsc = e.key === "Escape";

      if (isCmdK) {
        e.preventDefault();
        openSearch({ keepMenu: true });
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

  useEffect(() => {
    let alive = true;

    const loadNav = async () => {
      try {
        setNavLoading(true);
        const res = await fetch(`${API_URL}/api/home/nav`);
        if (!res.ok) throw new Error("nav fetch failed");
        const json = await res.json();
        if (!alive) return;
        setNavData(json);

        const genders = safeArr(json?.genders);
        if (genders.length && !activeGender)
          setActiveGender(genders[0]?.value || "");
      } catch {
        if (!alive) return;
        setNavData(null);
      } finally {
        if (!alive) return;
        setNavLoading(false);
      }
    };

    loadNav();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    const nextParams = new URLSearchParams(location.search);

    q ? nextParams.set("search", q) : nextParams.delete("search");
    nextParams.set("page", "1");

    setIsSearchActive(false);
    setIsMobileMenuOpen(false);

    navigate(`/products?${nextParams.toString()}`);
  };

  // ✅ FIX: don't auto-close the mobile drawer when user focuses the search input
  const openSearch = ({ keepMenu = false } = {}) => {
    setIsSearchActive(true);
    if (!keepMenu) setIsMobileMenuOpen(false);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    searchInputRef.current?.blur();
  };

  const closeAllOverlays = () => {
    setIsMobileMenuOpen(false);
    closeSearch();
  };

  const doLogout = async () => {
    await signOut({ redirectUrl: "/" });
  };

  const quickLinks = safeArr(navData?.quickLinks);
  const genders = safeArr(navData?.genders);
  const topStores = safeArr(navData?.topStores);
  const catsByGender = navData?.topCategoriesByGender || {};
  const activeCats = safeArr(catsByGender?.[activeGender]);

  return (
    <header
      className={[
        "phd-header",
        isSearchActive ? "search-mode" : "",
        isMobileMenuOpen ? "menu-open" : "",
        isDashboardRoute ? "dashboard-mode" : "",
      ].join(" ")}
    >
      <div className="phd-header-container">
        {/* left */}
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

        {/* logo */}
        <NavLink to="/" className="phd-logo" aria-label="Home">
          BangingPrices
        </NavLink>

        {/* desktop nav */}
        <nav className="phd-nav desktop-only" aria-label="Primary">
          <NavLink to="/products" className="phd-nav-link">
            Shop
          </NavLink>

          {!navLoading && quickLinks.length > 0 && (
            <div className="phd-nav-group">
              <button
                type="button"
                className="phd-nav-link phd-nav-trigger"
                onClick={() =>
                  navigate(quickLinks[0]?.to || "/products?page=1")
                }
                title="Quick links"
              >
                Quick links{" "}
                <span className="phd-nav-chevron">
                  <HeaderIcon name="chevronDown" />
                </span>
              </button>

              <div className="phd-nav-pop">
                {quickLinks.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    className="phd-nav-pop-item"
                    onClick={() => navigate(l.to)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!navLoading && genders.length > 0 && (
            <div className="phd-nav-group">
              <button
                type="button"
                className="phd-nav-link phd-nav-trigger"
                onClick={() => navigate(genders[0]?.to || "/products?page=1")}
                title="Shop by gender"
              >
                Shop by{" "}
                <span className="phd-nav-chevron">
                  <HeaderIcon name="chevronDown" />
                </span>
              </button>

              <div className="phd-nav-pop">
                {genders.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    className="phd-nav-pop-item"
                    onClick={() => navigate(g.to)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <SignedIn>
            <NavLink to="/tracked" className="phd-nav-link">
              Tracked
            </NavLink>
            <NavLink to="/dashboard" className="phd-nav-link">
              Dashboard
            </NavLink>
          </SignedIn>
        </nav>

        {/* search */}
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
              placeholder={
                isDashboardRoute ? "Search tracked products" : "Search products"
              }
              // ✅ FIX: keep drawer open; just activate search state + focus
              onFocus={() => openSearch({ keepMenu: true })}
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

        {/* actions */}
        <div className="phd-actions">
          <button
            className="phd-btn-icon mobile-only"
            onClick={() => openSearch({ keepMenu: false })}
            aria-label="Search"
            title="Search"
            type="button"
          >
            <HeaderIcon name="search" />
          </button>

          <NavLink
            to="/products"
            className="phd-btn-icon phd-icon-link desktop-only"
            aria-label="Shop"
            title="Shop"
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

            <button
              className="phd-btn-icon desktop-only"
              onClick={doLogout}
              aria-label="Log out"
              title="Log out"
              type="button"
            >
              <HeaderIcon name="logout" />
            </button>

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
        </div>
      </div>

      <div
        className={[
          "phd-overlay",
          isSearchActive || isMobileMenuOpen ? "show" : "",
        ].join(" ")}
        onPointerDown={(e) => {
          if (e.target !== e.currentTarget) return;
          closeAllOverlays();
        }}
        role="presentation"
      />

      {/* mobile drawer */}
      <div
        className={["phd-mobile-drawer", isMobileMenuOpen ? "open" : ""].join(
          " ",
        )}
      >
        <div className="phd-mobile-drawer-inner">
          {quickLinks.length > 0 && (
            <div className="phd-drawer-section">
              <div className="phd-drawer-title">Quick links</div>
              <div className="phd-drawer-grid">
                {quickLinks.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    className="phd-drawer-link"
                    onClick={() => {
                      navigate(l.to);
                      closeAllOverlays();
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {genders.length > 0 && (
            <div className="phd-drawer-section">
              <div className="phd-drawer-title">Shop by</div>
              <div className="phd-drawer-grid">
                {genders.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    className={[
                      "phd-drawer-link",
                      activeGender === g.value ? "active" : "",
                    ].join(" ")}
                    onClick={() => {
                      setActiveGender(g.value);
                      navigate(g.to);
                      closeAllOverlays();
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {genders.length > 0 && (
            <div className="phd-drawer-section">
              <button
                type="button"
                className="phd-drawer-accordion"
                onClick={() => setDrawerCatsOpen((v) => !v)}
              >
                <span>Top categories</span>
                <span
                  className={[
                    "phd-drawer-accordion-icon",
                    drawerCatsOpen ? "open" : "",
                  ].join(" ")}
                >
                  <HeaderIcon name="chevronDown" />
                </span>
              </button>

              {drawerCatsOpen && (
                <>
                  <div className="phd-drawer-subtitle">
                    {activeGender ? `For ${activeGender}` : "Browse"}
                  </div>

                  <div className="phd-drawer-grid">
                    {activeCats.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        className="phd-drawer-link"
                        onClick={() => {
                          navigate(c.to);
                          closeAllOverlays();
                        }}
                      >
                        {c.label}
                      </button>
                    ))}

                    {activeGender && (
                      <button
                        type="button"
                        className="phd-drawer-link phd-drawer-link-muted"
                        onClick={() => {
                          navigate(
                            `/products?gender=${encodeURIComponent(activeGender)}&page=1`,
                          );
                          closeAllOverlays();
                        }}
                      >
                        View all
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {topStores.length > 0 && (
            <div className="phd-drawer-section">
              <button
                type="button"
                className="phd-drawer-accordion"
                onClick={() => setDrawerStoresOpen((v) => !v)}
              >
                <span>Top stores</span>
                <span
                  className={[
                    "phd-drawer-accordion-icon",
                    drawerStoresOpen ? "open" : "",
                  ].join(" ")}
                >
                  <HeaderIcon name="chevronDown" />
                </span>
              </button>

              {drawerStoresOpen && (
                <div className="phd-drawer-grid">
                  {topStores.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      className="phd-drawer-link"
                      onClick={() => {
                        navigate(s.to);
                        closeAllOverlays();
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="phd-drawer-divider" />

          <SignedIn>
            <NavLink
              to="/saved-products"
              className="phd-drawer-link"
              onClick={closeAllOverlays}
            >
              Saved products
            </NavLink>

            <NavLink
              to="/tracked"
              className="phd-drawer-link"
              onClick={closeAllOverlays}
            >
              Tracked items
            </NavLink>

            <NavLink
              to="/dashboard"
              className="phd-drawer-link"
              onClick={closeAllOverlays}
            >
              Dashboard
            </NavLink>

            {/* ✅ explicit logout */}
            <button
              type="button"
              className="phd-drawer-btn phd-drawer-btn-logout"
              onClick={async () => {
                closeAllOverlays();
                await doLogout();
              }}
            >
              Log out
            </button>

            <div className="phd-drawer-user">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>

          <SignedOut>
            <button
              className="phd-drawer-btn"
              onClick={() => {
                navigate("/login");
                closeAllOverlays();
              }}
              type="button"
            >
              Log in
            </button>
            <button
              className="phd-drawer-btn phd-drawer-btn-primary"
              onClick={() => {
                navigate("/register");
                closeAllOverlays();
              }}
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
