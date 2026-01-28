import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./products.styles.scss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const fetchProducts = async (params) => {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/api/products?${qs}`);
  if (!res.ok) throw new Error("Network error");
  return res.json();
};

const fetchCategories = async (gender) => {
  const res = await fetch(
    `${API_URL}/api/products/categories?gender=${gender}`,
  );
  if (!res.ok) throw new Error("Network error");
  return res.json();
};

const ProductsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [toolbarHidden, setToolbarHidden] = useState(false);

  const lastYRef = useRef(0);
  const tickingRef = useRef(false);
  const interactingRef = useRef(false);
  const lastToggleAtRef = useRef(0);
  const toolbarRef = useRef(null);

  useEffect(() => {
    lastYRef.current = window.scrollY || 0;

    const onScroll = () => {
      if (interactingRef.current) return;
      if (toolbarRef.current?.contains(document.activeElement)) return;

      const y = window.scrollY || 0;

      if (y <= 12) {
        if (toolbarHidden) setToolbarHidden(false);
        lastYRef.current = y;
        return;
      }

      if (tickingRef.current) return;

      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        const now = Date.now();
        const delta = y - lastYRef.current;

        if (now - lastToggleAtRef.current < 180) {
          lastYRef.current = y;
          tickingRef.current = false;
          return;
        }

        if (delta > 14 && !toolbarHidden) {
          setToolbarHidden(true);
          lastToggleAtRef.current = now;
        }

        if (delta < -10 && toolbarHidden) {
          setToolbarHidden(false);
          lastToggleAtRef.current = now;
        }

        lastYRef.current = y;
        tickingRef.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [toolbarHidden]);

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const search = params.get("search") || "";
  const gender = params.get("gender") || "";
  const category = params.get("category") || "";
  const sort = params.get("sort") || "newest";
  const page = Number(params.get("page") || 1);

  const { data: catData } = useQuery({
    queryKey: ["categories", gender],
    queryFn: () => fetchCategories(gender),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["products", search, gender, category, sort, page],
    queryFn: () =>
      fetchProducts({
        search,
        gender,
        category,
        sort,
        page,
        limit: 24,
      }),
    keepPreviousData: true,
  });

  const setParam = (updates) => {
    const next = new URLSearchParams(location.search);

    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") next.delete(k);
      else next.set(k, String(v));
    });

    navigate(`/products?${next.toString()}`);
  };

  const categories = catData?.categories || [];
  const items = data?.items || [];
  const totalItems = data?.pagination?.total || 0;

  const lockToolbarInteraction = () => {
    interactingRef.current = true;
  };

  const unlockToolbarInteraction = () => {
    window.setTimeout(() => {
      interactingRef.current = false;
    }, 120);
  };

  return (
    <main className="pp-products">
      <section
        ref={toolbarRef}
        className={`pp-toolbar ${toolbarHidden ? "is-hidden" : ""}`}
        onPointerDown={lockToolbarInteraction}
        onPointerUp={unlockToolbarInteraction}
        onPointerCancel={unlockToolbarInteraction}
        onPointerLeave={unlockToolbarInteraction}
      >
        <div className="pp-container">
          <div className="pp-toolbar-inner">
            <div className="pp-genderbar">
              {["", "men", "women", "kids"].map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`pp-genderbtn ${gender === g ? "is-active" : ""}`}
                  onClick={() => setParam({ gender: g, category: "", page: 1 })}
                >
                  {g || "All"}
                </button>
              ))}
            </div>

            <div className="pp-catbar" aria-label="Categories">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`pp-catbtn ${category === c ? "is-active" : ""}`}
                  onClick={() =>
                    setParam({ category: category === c ? "" : c, page: 1 })
                  }
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="pp-meta-row">
            <span className="pp-results-count">{totalItems} Products</span>

            <select
              className="pp-sort-select"
              value={sort}
              onChange={(e) => setParam({ sort: e.target.value, page: 1 })}
              onFocus={lockToolbarInteraction}
              onBlur={unlockToolbarInteraction}
            >
              <option value="newest">Newest</option>
              <option value="discount-desc">Biggest Discount</option>
              <option value="price-asc">Price: Low</option>
              <option value="price-desc">Price: High</option>
            </select>
          </div>
        </div>
      </section>

      <div className="pp-container">
        {isLoading ? (
          <div className="pp-grid">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="pp-card-media skeleton"
                style={{ height: "350px" }}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="pp-grid">
              {items.map((p) => (
                <Link key={p._id} to={`/products/${p._id}`} className="pp-card">
                  <div className="pp-card-media">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="pp-card-img"
                      loading="lazy"
                      draggable="false"
                    />
                    {p.discountPercent > 0 && (
                      <div className="pp-badge">-{p.discountPercent}%</div>
                    )}
                  </div>

                  <div className="pp-card-details">
                    <span className="pp-card-store">{p.storeName}</span>
                    <h3 className="pp-card-title">{p.title}</h3>

                    <div className="pp-card-price">
                      <span className="pp-card-now">
                        {p.currency}
                        {p.price}
                      </span>

                      {p.originalPrice && (
                        <span className="pp-card-was">
                          {p.currency}
                          {p.originalPrice}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="pp-pager">
              <button
                type="button"
                disabled={page === 1}
                className="pp-pager-btn"
                onClick={() => setParam({ page: page - 1 })}
              >
                Prev
              </button>
              <button
                type="button"
                disabled={items.length < 24}
                className="pp-pager-btn"
                onClick={() => setParam({ page: page + 1 })}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default ProductsPage;
