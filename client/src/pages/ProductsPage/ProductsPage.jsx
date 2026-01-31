import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Spinner from "../../components/Spinner/Spinner";
import "./products.styles.scss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const fetchProducts = async (params) => {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/api/products?${qs}`);
  if (!res.ok) throw new Error("Network error");
  return res.json();
};

const fetchStores = async (params) => {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/api/products/stores?${qs}`);
  if (!res.ok) throw new Error("Network error");
  return res.json();
};

const ProductsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  // ✅ IMPORTANT: treat NEW IN as display only (no category param sent)
  const categoryParam = params.get("category") || "";
  const categoryLabel = categoryParam || "NEW IN";

  const sort = params.get("sort") || "newest";
  const store = params.get("store") || "all";
  const search = params.get("search") || "";
  const gender = params.get("gender") || "";

  // ✅ base query drives STORE DROPDOWN (never store/sort/page)
  // ✅ locked behavior: gender affects store dropdown
  // ✅ NEW IN: don't send category at all
  const baseStoreParams = useMemo(() => {
    const next = {};
    if (gender) next.gender = gender;
    if (categoryParam) next.category = categoryParam;
    if (search) next.search = search;
    return next;
  }, [gender, categoryParam, search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["products", location.search],
    queryFn: () => fetchProducts(Object.fromEntries(params)),
    keepPreviousData: true,
  });

  const { data: storesData, isLoading: storesLoading } = useQuery({
    queryKey: ["stores", baseStoreParams],
    queryFn: () => fetchStores(baseStoreParams),
    staleTime: 60_000,
  });

  const setParam = (updates) => {
    const next = new URLSearchParams(location.search);

    Object.entries(updates).forEach(([k, v]) => {
      v ? next.set(k, String(v)) : next.delete(k);
    });

    // ✅ reset store + page when base browsing context changes
    if ("gender" in updates || "category" in updates || "search" in updates) {
      next.delete("store");
      next.delete("page");
    }

    // ✅ reset page when store changes
    if ("store" in updates) {
      next.delete("page");
    }

    navigate(`/products?${next.toString()}`);
  };

  const items = data?.items || [];

  const storeOptions = useMemo(() => {
    const list = Array.isArray(storesData?.stores) ? storesData.stores : [];

    if (store && store !== "all" && !list.some((s) => s.value === store)) {
      return [{ value: store, label: store, count: 0 }, ...list];
    }

    return list;
  }, [storesData, store]);

  return (
    <main className="pp-products">
      <div className="pp-container">
        <header className="pp-toolbar">
          <h1 className="pp-category-title">{categoryLabel}</h1>

          <div className="pp-controls">
            <div className="pp-filter-wrapper">
              <span className="pp-filter-label">Store:</span>
              <select
                className="pp-filter-dropdown"
                value={store}
                disabled={storesLoading}
                onChange={(e) => {
                  const v = e.target.value;
                  setParam({ store: v === "all" ? "" : v });
                }}
              >
                <option value="all">
                  {storesLoading ? "Loading Stores..." : "All Stores"}
                </option>

                {storeOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                    {s.count ? ` (${s.count})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="pp-sort-wrapper">
              <span className="pp-sort-label">Sort By:</span>
              <select
                className="pp-sort-dropdown"
                value={sort}
                onChange={(e) => setParam({ sort: e.target.value })}
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </header>

        <div className="pp-grid">
          {isLoading ? (
            <div className="pp-spinner-wrap">
              <Spinner label="Intercepting Live Drops..." fullscreen={false} />
            </div>
          ) : items.length === 0 ? (
            <div className="pp-empty-state">
              <p className="pp-empty-title">No products found.</p>
              <p className="pp-empty-sub">
                Try changing store, search, or category.
              </p>
            </div>
          ) : (
            items.map((p) => (
              <Link key={p._id} to={`/products/${p._id}`} className="pp-item">
                <div className="pp-image-wrap">
                  {p.discountPercent > 0 && (
                    <div className="pp-discount-badge">
                      -{p.discountPercent}%
                    </div>
                  )}

                  <img
                    src={p.image}
                    alt={p.title}
                    className="pp-image"
                    loading="lazy"
                  />

                  <button
                    className="pp-wishlist-btn"
                    aria-label="Add to wishlist"
                    onClick={(e) => e.preventDefault()}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
                </div>

                <div className="pp-details">
                  <span className="pp-store-name">{p.storeName}</span>
                  <h3 className="pp-product-title">{p.title}</h3>
                  <div className="pp-price-row">
                    <span className="pp-price">
                      {p.currency}
                      {p.price}
                    </span>
                    {p.originalPrice > p.price && (
                      <span className="pp-original-price">
                        {p.currency}
                        {p.originalPrice}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {isFetching && !isLoading ? (
          <div className="pp-updating-hint">Updating…</div>
        ) : null}
      </div>
    </main>
  );
};

export default ProductsPage;
