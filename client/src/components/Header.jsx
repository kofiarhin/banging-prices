import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
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
    chevronRight: <path d="M9 18l6-6-6-6" />,
    chevronLeft: <path d="M15 18l-6-6 6-6" />,
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

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [navData, setNavData] = useState(null);
  const [navLoading, setNavLoading] = useState(false);

  const [activeGender, setActiveGender] = useState("");

  // desktop mega
  const [megaOpen, setMegaOpen] = useState(false);
  const [activeMegaTab, setActiveMegaTab] = useState("");

  // mobile drawer views (Nike-style)
  const [drawerView, setDrawerView] = useState("root"); // root | panel
  const [drawerTab, setDrawerTab] = useState(""); // tab.value

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
  }, [location.search, params]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const isEsc = e.key === "Escape";

      if (isCmdK) {
        e.preventDefault();
        openSearch();
      }

      if (isEsc) {
        closeAllOverlays();
        setMegaOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMegaOpen(false);
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
        if (genders.length && !activeGender) {
          setActiveGender(genders[0]?.value || "");
        }

        const tabs = safeArr(json?.megaMenu?.tabs);
        if (tabs.length && !activeMegaTab) {
          setActiveMegaTab(tabs[0]?.value || "");
        }
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

    closeAllOverlays();
    setMegaOpen(false);

    navigate(`/products?${nextParams.toString()}`);
  };

  const openSearch = () => {
    setIsSearchActive(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    searchInputRef.current?.blur();
  };

  const closeAllOverlays = () => {
    setIsMobileMenuOpen(false);
    closeSearch();
    setDrawerView("root");
    setDrawerTab("");
  };

  const megaTabs = safeArr(navData?.megaMenu?.tabs);
  const megaPanels = navData?.megaMenu?.panels || {};

  const activePanel =
    megaOpen && activeMegaTab ? megaPanels?.[activeMegaTab] : null;

  const quickLinks = safeArr(navData?.quickLinks);
  const popularTerms = quickLinks.slice(0, 7).map((l) => l.label);

  const toggleDrawer = () => {
    setIsMobileMenuOpen((v) => {
      const next = !v;
      if (next) {
        setIsSearchActive(false);
        setMegaOpen(false);
        setDrawerView("root");
        setDrawerTab("");
      }
      return next;
    });
  };

  const openDrawerPanel = (tabValue) => {
    setDrawerTab(tabValue);
    setDrawerView("panel");
  };

  const drawerPanel = drawerTab ? megaPanels?.[drawerTab] : null;

  const showDim =
    isMobileMenuOpen || isSearchActive || (megaOpen && !!activePanel);

  return (
    <>
      <header
        className={[
          "phd-header",
          isMobileMenuOpen ? "menu-open" : "",
          isDashboardRoute ? "dashboard-mode" : "",
        ].join(" ")}
        onMouseLeave={() => setMegaOpen(false)}
      >
        <div className="phd-header-container">
          {/* mobile hamburger */}
          <button
            className="phd-btn-icon mobile-only"
            onClick={toggleDrawer}
            aria-label="Menu"
            title="Menu"
            type="button"
          >
            <HeaderIcon name={isMobileMenuOpen ? "close" : "menu"} />
          </button>

          {/* logo */}
          <NavLink
            to="/"
            className="phd-logo"
            aria-label="Home"
            onMouseEnter={() => setMegaOpen(false)}
          >
            BangingPrices
          </NavLink>

          {/* desktop center nav (centered) */}
          <nav className="phd-topnav desktop-only" aria-label="Primary">
            {!navLoading &&
              megaTabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={[
                    "phd-topnav-link",
                    activeMegaTab === t.value ? "active" : "",
                  ].join(" ")}
                  onMouseEnter={() => {
                    setActiveMegaTab(t.value);
                    setMegaOpen(true);
                  }}
                  onFocus={() => {
                    setActiveMegaTab(t.value);
                    setMegaOpen(true);
                  }}
                  onClick={() => navigate(t.to)}
                  aria-haspopup="true"
                  aria-expanded={megaOpen && activeMegaTab === t.value}
                >
                  {t.label}
                </button>
              ))}
          </nav>

          {/* right actions (kept right without affecting center) */}
          <div className="phd-actions phd-actions-right">
            <button
              className="phd-btn-icon"
              onClick={openSearch}
              aria-label="Search"
              title="Search"
              type="button"
            >
              <HeaderIcon name="search" />
            </button>

            <SignedIn>
              <button
                className="phd-btn-icon"
                onClick={() => navigate("/saved-products")}
                aria-label="Saved products"
                title="Saved products"
                type="button"
              >
                <HeaderIcon name="heart" />
              </button>

              <div className="phd-clerk-wrapper">
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>

            <SignedOut>
              <button
                className="phd-btn-icon"
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

        {/* desktop mega panel */}
        {activePanel && (
          <div
            className={["phd-mega", megaOpen ? "open" : ""].join(" ")}
            onMouseEnter={() => setMegaOpen(true)}
          >
            <div className="phd-mega-inner">
              <div className="phd-mega-grid">
                {safeArr(activePanel.columns).map((col) => (
                  <div key={col.key} className="phd-mega-col">
                    <div className="phd-mega-title">{col.title}</div>
                    <div className="phd-mega-links">
                      {safeArr(col.links).map((l) => (
                        <button
                          key={l.key}
                          type="button"
                          className="phd-mega-link"
                          onClick={() => {
                            navigate(l.to);
                            setMegaOpen(false);
                          }}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* dim overlay */}
      <div
        className={["phd-overlay", showDim ? "show" : ""].join(" ")}
        onPointerDown={(e) => {
          if (e.target !== e.currentTarget) return;
          closeAllOverlays();
          setMegaOpen(false);
        }}
        role="presentation"
      />

      {/* SEARCH OVERLAY (Nike-style) */}
      <div
        className={["phd-search-modal", isSearchActive ? "open" : ""].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <div className="phd-search-top">
          <NavLink
            to="/"
            className="phd-search-logo"
            aria-label="Home"
            onClick={closeAllOverlays}
          >
            BangingPrices
          </NavLink>

          <form className="phd-search-modal-form" onSubmit={handleSearch}>
            <div className="phd-search-modal-field">
              <span className="phd-search-modal-icon" aria-hidden="true">
                <HeaderIcon name="search" />
              </span>

              <input
                ref={searchInputRef}
                className="phd-search-modal-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                aria-label="Search products"
              />
            </div>
          </form>

          <button
            type="button"
            className="phd-search-cancel"
            onClick={closeSearch}
          >
            Cancel
          </button>
        </div>

        <div className="phd-search-body">
          <div className="phd-search-section-title">Popular Search Terms</div>
          <div className="phd-search-terms">
            {popularTerms.map((t) => (
              <button
                key={t}
                type="button"
                className="phd-search-term"
                onClick={() => {
                  setSearch(t);
                  requestAnimationFrame(() => searchInputRef.current?.focus());
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE DRAWER (Nike-style left + 2-level) */}
      <div
        className={["phd-mobile-drawer", isMobileMenuOpen ? "open" : ""].join(
          " ",
        )}
      >
        <div className="phd-mobile-drawer-top">
          {drawerView === "panel" ? (
            <button
              type="button"
              className="phd-drawer-back"
              onClick={() => {
                setDrawerView("root");
                setDrawerTab("");
              }}
              aria-label="Back"
              title="Back"
            >
              <HeaderIcon name="chevronLeft" />
              <span>All</span>
            </button>
          ) : (
            <div className="phd-drawer-spacer" />
          )}

          <button
            type="button"
            className="phd-drawer-x"
            onClick={closeAllOverlays}
            aria-label="Close"
            title="Close"
          >
            <HeaderIcon name="close" />
          </button>
        </div>

        <div className="phd-mobile-drawer-inner">
          {drawerView === "root" && (
            <div className="phd-drawer-root">
              {!navLoading &&
                megaTabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className="phd-drawer-row"
                    onClick={() => openDrawerPanel(t.value)}
                  >
                    <span>{t.label}</span>
                    <span className="phd-drawer-row-icon" aria-hidden="true">
                      <HeaderIcon name="chevronRight" />
                    </span>
                  </button>
                ))}

              <div className="phd-drawer-divider" />

              <SignedIn>
                <button
                  type="button"
                  className="phd-drawer-row"
                  onClick={() => {
                    navigate("/saved-products");
                    closeAllOverlays();
                  }}
                >
                  <span>Saved products</span>
                </button>

                <button
                  type="button"
                  className="phd-drawer-row"
                  onClick={() => {
                    navigate("/tracked");
                    closeAllOverlays();
                  }}
                >
                  <span>Tracked items</span>
                </button>

                <button
                  type="button"
                  className="phd-drawer-row"
                  onClick={() => {
                    navigate("/dashboard");
                    closeAllOverlays();
                  }}
                >
                  <span>Dashboard</span>
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
          )}

          {drawerView === "panel" && drawerPanel && (
            <div className="phd-drawer-panel">
              <div className="phd-drawer-panel-title">{drawerPanel.label}</div>

              <div className="phd-drawer-panel-grid">
                {safeArr(drawerPanel.columns).map((col) => (
                  <div key={col.key} className="phd-drawer-panel-col">
                    <div className="phd-drawer-panel-col-title">
                      {col.title}
                    </div>
                    <div className="phd-drawer-panel-links">
                      {safeArr(col.links).map((l) => (
                        <button
                          key={l.key}
                          type="button"
                          className="phd-drawer-panel-link"
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
                ))}
              </div>

              <button
                type="button"
                className="phd-drawer-viewall"
                onClick={() => {
                  navigate(drawerPanel.to);
                  closeAllOverlays();
                }}
              >
                View all
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Header;
