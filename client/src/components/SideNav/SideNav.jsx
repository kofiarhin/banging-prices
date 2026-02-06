import { useEffect, useMemo, useRef } from "react";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

import "./sidenav.styles.scss";

const Icon = ({ name }) => {
  const paths = {
    close: "M18 6L6 18M6 6l12 12",
    chevronRight: "M9 18l6-6-6-6",
    chevronLeft: "M15 18l-6-6 6-6",
  };

  const d = paths[name];
  if (!d) return null;

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
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

const SideNav = ({ isOpen, onClose, navData, onNavigate, stack, setStack }) => {
  const panelKey =
    (stack && stack.length ? stack[stack.length - 1] : "root") || "root";
  const closeBtnRef = useRef(null);

  const topCategoriesByGender = navData?.topCategoriesByGender || {
    men: [],
    women: [],
    kids: [],
  };

  const topStores = navData?.topStores || [];

  const title = useMemo(() => {
    if (panelKey === "root") return "Menu";
    if (panelKey === "men") return "Men";
    if (panelKey === "women") return "Women";
    if (panelKey === "kids") return "Kids";
    if (panelKey === "stores") return "Stores";
    return "Menu";
  }, [panelKey]);

  const push = (key) => setStack((s) => [...s, key]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : ["root"]));
  const reset = () => setStack(["root"]);

  const go = (url) => {
    onNavigate(url);
    onClose();
    reset();
  };

  const goGenderAll = (g) => go(`/products?gender=${g}&page=1`);
  const goGenderNewest = (g) => go(`/products?gender=${g}&sort=newest&page=1`);
  const goGenderCategory = (g, cat) =>
    go(`/products?gender=${g}&category=${encodeURIComponent(cat)}&page=1`);
  const goStore = (storeValue) =>
    go(`/products?store=${encodeURIComponent(storeValue)}&page=1`);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
        reset();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    closeBtnRef.current?.focus?.();
  }, [isOpen]);

  return (
    <>
      <div
        className={`phd-sidenav-backdrop ${isOpen ? "open" : ""}`}
        onClick={() => {
          onClose();
          reset();
        }}
      />

      <aside
        className={`phd-sidenav ${isOpen ? "open" : ""}`}
        aria-hidden={!isOpen}
      >
        <div className="phd-sidenav-top">
          <div className="phd-sidenav-top-left">
            {stack.length > 1 ? (
              <button
                className="phd-sidenav-icon-btn"
                type="button"
                onClick={pop}
                aria-label="Back"
              >
                <Icon name="chevronLeft" />
              </button>
            ) : (
              <div className="phd-sidenav-spacer" />
            )}

            <div className="phd-sidenav-title">{title}</div>
          </div>

          <button
            ref={closeBtnRef}
            className="phd-sidenav-icon-btn"
            type="button"
            onClick={() => {
              onClose();
              reset();
            }}
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="phd-sidenav-body">
          <div className="phd-sidenav-list">
            {panelKey === "root" && (
              <>
                <button
                  className="phd-sidenav-item"
                  type="button"
                  onClick={() => go("/")}
                >
                  Home
                </button>
                <button
                  className="phd-sidenav-item"
                  type="button"
                  onClick={() => go("/products?page=1")}
                >
                  Products
                </button>

                <button
                  className="phd-sidenav-item has-next"
                  type="button"
                  onClick={() => push("men")}
                >
                  Men{" "}
                  <span className="phd-sidenav-next">
                    <Icon name="chevronRight" />
                  </span>
                </button>
                <button
                  className="phd-sidenav-item has-next"
                  type="button"
                  onClick={() => push("women")}
                >
                  Women{" "}
                  <span className="phd-sidenav-next">
                    <Icon name="chevronRight" />
                  </span>
                </button>
                <button
                  className="phd-sidenav-item has-next"
                  type="button"
                  onClick={() => push("kids")}
                >
                  Kids{" "}
                  <span className="phd-sidenav-next">
                    <Icon name="chevronRight" />
                  </span>
                </button>
                <button
                  className="phd-sidenav-item has-next"
                  type="button"
                  onClick={() => push("stores")}
                >
                  Stores{" "}
                  <span className="phd-sidenav-next">
                    <Icon name="chevronRight" />
                  </span>
                </button>

                <div className="phd-sidenav-divider" />

                <button
                  className="phd-sidenav-item"
                  type="button"
                  onClick={() => go("/saved-products")}
                >
                  Saved Products
                </button>
                <button
                  className="phd-sidenav-item"
                  type="button"
                  onClick={() => go("/tracked")}
                >
                  Tracked Alerts
                </button>
                <button
                  className="phd-sidenav-item"
                  type="button"
                  onClick={() => go("/dashboard")}
                >
                  Dashboard
                </button>

                <div className="phd-sidenav-divider" />

                <SignedOut>
                  <button
                    className="phd-sidenav-item"
                    type="button"
                    onClick={() => go("/login")}
                  >
                    Login
                  </button>
                  <button
                    className="phd-sidenav-item"
                    type="button"
                    onClick={() => go("/register")}
                  >
                    Register
                  </button>
                </SignedOut>

                <SignedIn>
                  <div className="phd-sidenav-account">
                    <div className="phd-sidenav-account-text">Account</div>
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </SignedIn>
              </>
            )}

            {(panelKey === "men" ||
              panelKey === "women" ||
              panelKey === "kids") && (
              <>
                <button
                  className="phd-sidenav-item"
                  type="button"
                  onClick={() => goGenderAll(panelKey)}
                >
                  View All
                </button>
                <button
                  className="phd-sidenav-item"
                  type="button"
                  onClick={() => goGenderNewest(panelKey)}
                >
                  New Arrivals
                </button>

                <div className="phd-sidenav-divider" />

                <div className="phd-sidenav-title">Categories</div>

                {(() => {
                  const cats = topCategoriesByGender?.[panelKey] || [];
                  if (!cats.length)
                    return (
                      <div className="phd-sidenav-empty">No categories yet</div>
                    );
                  return cats.map((cat) => (
                    <button
                      key={`${panelKey}-${cat}`}
                      className="phd-sidenav-item"
                      type="button"
                      onClick={() => goGenderCategory(panelKey, cat)}
                    >
                      {toLabel(cat)}
                    </button>
                  ));
                })()}
              </>
            )}

            {panelKey === "stores" && (
              <>
                {topStores.length ? (
                  topStores.map((s) => (
                    <button
                      key={s.value}
                      className="phd-sidenav-item"
                      type="button"
                      onClick={() => goStore(s.value)}
                    >
                      {s.label}
                    </button>
                  ))
                ) : (
                  <div className="phd-sidenav-empty">No stores yet</div>
                )}
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default SideNav;
