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
  const [drawerCatsOpen, setDrawerCatsOpen] = useState(true);
  const [drawerStoresOpen, setDrawerStoresOpen] = useState(false);

  const [megaKey, setMegaKey] = useState(""); // desktop mega menu open key

  const searchInputRef = useRef(null);
  const megaWrapRef = useRef(null);

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const [search, setSearch] = useState(params.get("search") || "");

  const isDashboardRoute =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/tracked") ||
    location.pathname.startsWith("/saved-products");

  const isMegaOpen = !!megaKey;

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
        closeSearch();
        setIsMobileMenuOpen(false);
        setMegaKey("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMegaKey("");
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

  useEffect(() => {
    const onDocPointerDown = (e) => {
      if (!isMegaOpen) return;
      const wrap = megaWrapRef.current;
      if (!wrap) return;
      if (wrap.contains(e.target)) return;
      setMegaKey("");
    };

    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [isMegaOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    const nextParams = new URLSearchParams(location.search);

    q ? nextParams.set("search", q) : nextParams.delete("search");
    nextParams.set("page", "1");

    setIsSearchActive(false);
    setIsMobileMenuOpen(false);
    setMegaKey("");

    navigate(`/products?${nextParams.toString()}`);
  };

  const openSearch = () => {
    setIsSearchActive(true);
    setMegaKey("");
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    searchInputRef.current?.blur();
  };

  const closeAllOverlays = () => {
    setIsMobileMenuOpen(false);
    closeSearch();
    setMegaKey("");
  };

  const quickLinks = safeArr(navData?.quickLinks);
  const genders = safeArr(navData?.genders);
  const topStores = safeArr(navData?.topStores);
  const catsByGender = navData?.topCategoriesByGender || {};

  // ----- Nike-like top nav items (centered) -----
  const topNavItems = useMemo(() => {
    const list = [];

    // "New" uses quickLinks as its highlights
    list.push({
      key: "new",
      label: "New",
      kind: "new",
    });

    // take up to 4 genders (Men/Women/Kids/etc) - you can control order from API later
    safeArr(genders)
      .slice(0, 4)
      .forEach((g) => {
        list.push({
          key: g.value || g.key,
          label: g.label,
          kind: "gender",
          gender: g.value,
          to: g.to,
        });
      });

    // If you want Sport as a fixed item but don’t have gender=sport in DB,
    // keep it here and you can wire it to a filter later.
    if (!list.find((x) => String(x.label).toLowerCase() === "sport")) {
      list.push({ key: "sport", label: "Sport", kind: "sport" });
    }

    return list;
  }, [genders]);

  const getMegaColumns = () => {
    const key = megaKey;

    if (!key) return [];

    if (key === "new") {
      const col1 = {
        title: "Highlights",
        items: quickLinks.map((l) => ({
          key: l.key,
          label: l.label,
          to: l.to,
        })),
      };

      const col2 = {
        title: "Brands",
        items: topStores.map((s) => ({ key: s.key, label: s.label, to: s.to })),
      };

      return [col1, col2].filter((c) => (c.items || []).length > 0);
    }

    // sport (placeholder grouping)
    if (key === "sport") {
      const col1 = {
        title: "Sport",
        items: [
          {
            key: "running",
            label: "Running",
            to: "/products?category=running&page=1",
          },
          {
            key: "football",
            label: "Football",
            to: "/products?category=football&page=1",
          },
          {
            key: "basketball",
            label: "Basketball",
            to: "/products?category=basketball&page=1",
          },
          {
            key: "training",
            label: "Training",
            to: "/products?category=training&page=1",
          },
        ],
      };

      const col2 = {
        title: "Brands",
        items: topStores.map((s) => ({ key: s.key, label: s.label, to: s.to })),
      };

      return [col1, col2].filter((c) => (c.items || []).length > 0);
    }

    // gender mega
    const gender = key;
    const cats = safeArr(catsByGender?.[gender]);
    const colHighlights = {
      title: "Highlights",
      items: [
        ...quickLinks.map((l) => ({ key: l.key, label: l.label, to: l.to })),
        {
          key: `view-all-${gender}`,
          label: "View all",
          to: `/products?gender=${encodeURIComponent(gender)}&page=1`,
        },
      ],
    };

    const colClothing = {
      title: "Clothing",
      items: cats
        .slice(0, 8)
        .map((c) => ({ key: c.key, label: c.label, to: c.to })),
    };

    const colBrands = {
      title: "Brands",
      items: topStores
        .slice(0, 8)
        .map((s) => ({ key: s.key, label: s.label, to: s.to })),
    };

    // optional "More" column from remaining categories
    const remaining = cats.slice(8, 16);
    const colMore =
      remaining.length > 0
        ? {
            title: "More",
            items: remaining.map((c) => ({
              key: c.key,
              label: c.label,
              to: c.to,
            })),
          }
        : null;

    return [colHighlights, colClothing, colBrands, colMore].filter(Boolean);
  };

  const megaColumns = getMegaColumns();

  return (
    <>
      <header
        className={[
          "phd-header",
          isSearchActive ? "search-mode" : "",
          isMobileMenuOpen ? "menu-open" : "",
          isDashboardRoute ? "dashboard-mode" : "",
        ].join(" ")}
      >
        <div className="phd-header-container" ref={megaWrapRef}>
          {/* left */}
          <button
            className="phd-btn-icon mobile-only"
            onClick={() => {
              setIsMobileMenuOpen((v) => !v);
              setIsSearchActive(false);
              setMegaKey("");
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

          {/* centered desktop nav */}
          <nav className="phd-nav desktop-only" aria-label="Primary">
            {!navLoading &&
              topNavItems.map((item) => {
                const isActive =
                  item.kind === "gender"
                    ? location.search.includes(
                        `gender=${encodeURIComponent(item.gender || "")}`,
                      )
                    : false;

                return (
                  <button
                    key={item.key}
                    type="button"
                    className={["phd-top-link", isActive ? "active" : ""].join(
                      " ",
                    )}
                    onMouseEnter={() => {
                      if (item.kind === "gender")
                        setActiveGender(item.gender || "");
                      setMegaKey(
                        item.kind === "gender" ? item.gender : item.key,
                      );
                    }}
                    onFocus={() => {
                      if (item.kind === "gender")
                        setActiveGender(item.gender || "");
                      setMegaKey(
                        item.kind === "gender" ? item.gender : item.key,
                      );
                    }}
                    onClick={() => {
                      // click navigates like Nike (and still keeps mega hover behavior)
                      if (item.kind === "gender" && item.to) navigate(item.to);
                      if (item.kind === "new") navigate("/products?page=1");
                      if (item.kind === "sport") navigate("/products?page=1");
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
          </nav>

          {/* search (kept) */}
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
                  isDashboardRoute
                    ? "Search tracked products"
                    : "Search products"
                }
                onFocus={() => {
                  setIsSearchActive(true);
                  setMegaKey("");
                }}
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
              onClick={openSearch}
              aria-label="Search"
              title="Search"
              type="button"
            >
              <HeaderIcon name="search" />
            </button>

            <SignedIn>
              <button
                className="phd-btn-icon mobile-only"
                onClick={() => navigate("/saved-products")}
                aria-label="Saved products"
                title="Saved products"
                type="button"
              >
                <HeaderIcon name="heart" />
              </button>

              <div className="phd-clerk-wrapper mobile-only">
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>

            <SignedOut>
              <button
                className="phd-btn-icon mobile-only"
                onClick={() => navigate("/login")}
                aria-label="Log in"
                title="Log in"
                type="button"
              >
                <HeaderIcon name="login" />
              </button>
            </SignedOut>

            {/* desktop actions */}
            <NavLink
              to="/products"
              className="phd-btn-icon phd-icon-link desktop-only"
              aria-label="Shop"
              title="Shop"
              onMouseEnter={() => setMegaKey("")}
              onFocus={() => setMegaKey("")}
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
                onMouseEnter={() => setMegaKey("")}
                onFocus={() => setMegaKey("")}
              >
                <HeaderIcon name="heart" />
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
                onMouseEnter={() => setMegaKey("")}
                onFocus={() => setMegaKey("")}
              >
                <HeaderIcon name="login" />
              </button>

              <button
                className="phd-btn-icon desktop-only"
                onClick={() => navigate("/register")}
                aria-label="Register"
                title="Register"
                type="button"
                onMouseEnter={() => setMegaKey("")}
                onFocus={() => setMegaKey("")}
              >
                <HeaderIcon name="register" />
              </button>
            </SignedOut>
          </div>

          {/* desktop mega dropdown (Nike-style centered columns) */}
          {!navLoading && isMegaOpen && megaColumns.length > 0 && (
            <div
              className="phd-mega"
              onMouseLeave={() => setMegaKey("")}
              role="presentation"
            >
              <div className="phd-mega-inner">
                <div className="phd-mega-grid">
                  {megaColumns.map((col) => (
                    <div key={col.title} className="phd-mega-col">
                      <div className="phd-mega-title">{col.title}</div>
                      <div className="phd-mega-links">
                        {safeArr(col.items).map((it) => (
                          <button
                            key={it.key}
                            type="button"
                            className="phd-mega-link"
                            onClick={() => {
                              navigate(it.to);
                              setMegaKey("");
                            }}
                          >
                            {it.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* overlay (also used to click-close mega on desktop) */}
      <div
        className={[
          "phd-overlay",
          isSearchActive || isMobileMenuOpen || isMegaOpen ? "show" : "",
          isMegaOpen && !isSearchActive && !isMobileMenuOpen ? "mega" : "",
        ].join(" ")}
        onPointerDown={(e) => {
          if (e.target !== e.currentTarget) return;
          closeAllOverlays();
        }}
        role="presentation"
      />

      {/* mobile drawer (unchanged behavior) */}
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
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>

              {drawerCatsOpen && (
                <>
                  <div className="phd-drawer-subtitle">
                    {activeGender ? `For ${activeGender}` : "Browse"}
                  </div>

                  <div className="phd-drawer-grid">
                    {safeArr(catsByGender?.[activeGender]).map((c) => (
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
                    <path d="M6 9l6 6 6-6" />
                  </svg>
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
    </>
  );
};

export default Header;
