import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./products.styles.scss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const fetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Network error");
  return res.json();
};

const fetchProducts = async (params) => {
  const qs = new URLSearchParams(params).toString();
  return fetchJson(`${API_URL}/api/products?${qs}`);
};

const fetchStores = async (params) => {
  const qs = new URLSearchParams(params).toString();
  return fetchJson(`${API_URL}/api/products/stores?${qs}`);
};

const fetchCategories = async (params) => {
  const qs = new URLSearchParams(params).toString();
  return fetchJson(`${API_URL}/api/products/categories?${qs}`);
};

const titleFromCategory = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return "NEW IN";
  return s.replace(/-/g, " ").toUpperCase();
};

const toLabel = (slug = "") =>
  String(slug || "")
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const getPageNumbers = (current, total) => {
  if (!total || total <= 1) return [1];
  const set = new Set([
    1,
    total,
    current,
    current - 1,
    current + 1,
    current - 2,
    current + 2,
  ]);
  const nums = [...set]
    .filter((x) => x >= 1 && x <= total)
    .sort((a, b) => a - b);

  const out = [];
  for (let i = 0; i < nums.length; i++) {
    const prev = nums[i - 1];
    const cur = nums[i];
    if (i > 0 && cur - prev > 1) out.push("…");
    out.push(cur);
  }
  return out;
};

const ProductsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const rawCategory = params.get("category") || "";
  const rawSearch = params.get("search") || params.get("q") || "";
  const sort = params.get("sort") || "newest";

  const gender = params.get("gender") || "";
  const category = rawCategory;
  const store = params.get("store") || "";
  const page = Number(params.get("page") || 1);

  const pageTitle = rawSearch
    ? `SEARCH: ${String(rawSearch).trim().toUpperCase()}`
    : titleFromCategory(rawCategory);

  const setParam = (updates) => {
    const next = new URLSearchParams(location.search);

    Object.entries(updates).forEach(([k, v]) => {
      v === 0 ? next.set(k, "0") : v ? next.set(k, String(v)) : next.delete(k);
    });

    navigate(`/products?${next.toString()}`);
  };

  // ✅ FLOW: gender -> category -> store
  const handleGender = (nextGender) => {
    setParam({
      gender: nextGender,
      category: "",
      store: "",
      page: 1,
    });
  };

  const handleCategory = (nextCategory) => {
    setParam({
      category: nextCategory,
      store: "",
      page: 1,
    });
  };

  const handleStore = (nextStore) => {
    setParam({
      store: nextStore,
      page: 1,
    });
  };

  const apiParams = useMemo(() => {
    const obj = Object.fromEntries(params);

    if (obj.search && !obj.q) obj.q = obj.search;
    if (!obj.page) obj.page = "1";
    if (!obj.sort) obj.sort = "newest";
    if (!obj.limit) obj.limit = "24"; // ✅ pick a nice page size

    return obj;
  }, [params]);

  // ✅ categories depend on gender (+ search), NOT category/store
  const categoriesParams = useMemo(() => {
    const obj = Object.fromEntries(params);

    if (obj.search && !obj.q) obj.q = obj.search;

    delete obj.category;
    delete obj.store;
    delete obj.page;
    delete obj.limit;
    delete obj.sort;

    return obj;
  }, [params]);

  // ✅ stores depend on gender + category (+ search), NOT store
  const storesParams = useMemo(() => {
    const obj = Object.fromEntries(params);

    if (obj.search && !obj.q) obj.q = obj.search;

    delete obj.store;
    delete obj.page;
    delete obj.limit;
    delete obj.sort;

    return obj;
  }, [params]);

  const { data, isLoading } = useQuery({
    queryKey: ["products", apiParams],
    queryFn: () => fetchProducts(apiParams),
    keepPreviousData: true,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", categoriesParams],
    queryFn: () => fetchCategories(categoriesParams),
    keepPreviousData: true,
    enabled: Boolean(gender),
  });

  const { data: storesData } = useQuery({
    queryKey: ["stores", storesParams],
    queryFn: () => fetchStores(storesParams),
    keepPreviousData: true,
    enabled: Boolean(gender && category),
  });

  const items = data?.items || [];
  const pagination = data?.pagination || null;

  const categories = categoriesData?.categories || [];
  const stores = storesData?.stores || [];

  const categoriesTotal = categories.reduce((a, c) => a + (c.count || 0), 0);
  const storesTotal = stores.reduce((a, s) => a + (s.count || 0), 0);

  const currentPage = pagination?.page || page || 1;
  const totalPages = pagination?.pages || 1;
  const totalItems = pagination?.total || items.length || 0;

  const goToPage = (nextPage) => {
    const safe = clamp(Number(nextPage) || 1, 1, totalPages || 1);
    setParam({ page: safe });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageNums = getPageNumbers(currentPage, totalPages);

  return (
    <main className="pp-products">
      <div className="pp-container">
        <header className="pp-toolbar">
          <div className="pp-toolbar-left">
            <h1 className="pp-category-title">{pageTitle}</h1>

            <div className="pp-flow">
              <div className="pp-flow-block">
                <div className="pp-filter-label">Gender</div>
                <select
                  className="pp-filter-dropdown"
                  value={gender}
                  onChange={(e) => handleGender(e.target.value)}
                >
                  <option value="">ALL</option>
                  <option value="men">MEN</option>
                  <option value="women">WOMEN</option>
                  <option value="kids">KIDS</option>
                </select>
              </div>

              <div className="pp-flow-block">
                <div className="pp-filter-label">Category</div>
                <select
                  className="pp-filter-dropdown"
                  value={category}
                  onChange={(e) => handleCategory(e.target.value)}
                  disabled={!gender}
                >
                  <option value="">
                    {gender
                      ? `ALL CATEGORIES${categoriesTotal ? ` (${categoriesTotal})` : ""}`
                      : "SELECT GENDER FIRST"}
                  </option>

                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {toLabel(c.value).toUpperCase()}
                      {typeof c.count === "number" ? ` (${c.count})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pp-flow-block">
                <div className="pp-filter-label">Store</div>
                <select
                  className="pp-filter-dropdown"
                  value={store}
                  onChange={(e) => handleStore(e.target.value)}
                  disabled={!gender || !category}
                >
                  <option value="">
                    {gender && category
                      ? `ALL STORES${storesTotal ? ` (${storesTotal})` : ""}`
                      : "SELECT CATEGORY FIRST"}
                  </option>

                  {stores.map((s) => (
                    <option key={s.value} value={s.value}>
                      {String(s.label || s.value).toUpperCase()}
                      {typeof s.count === "number" ? ` (${s.count})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pp-sort-wrapper">
            <span className="pp-sort-label">Sort By:</span>
            <select
              className="pp-sort-dropdown"
              value={sort}
              onChange={(e) => setParam({ sort: e.target.value, page: 1 })}
            >
              <option value="newest">Newest</option>
              <option value="discount-desc">Biggest Discount</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </header>

        <div className="pp-results-bar">
          <div className="pp-results-count">
            {totalItems ? `${totalItems} results` : "0 results"}
          </div>

          {totalPages > 1 && (
            <div className="pp-page-meta">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>

        <div className="pp-grid">
          {isLoading
            ? [...Array(8)].map((_, i) => (
                <div key={i} className="pp-item">
                  <div className="pp-skeleton-media" />
                  <div className="pp-skeleton-text" />
                </div>
              ))
            : items.map((p) => (
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
              ))}
        </div>

        {totalPages > 1 && (
          <nav className="pp-pagination" aria-label="Pagination">
            <button
              className="pp-page-btn"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              Prev
            </button>

            <div className="pp-page-nums">
              {pageNums.map((n, idx) =>
                n === "…" ? (
                  <span key={`dots-${idx}`} className="pp-page-dots">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    className={`pp-page-num ${n === currentPage ? "is-active" : ""}`}
                    onClick={() => goToPage(n)}
                  >
                    {n}
                  </button>
                ),
              )}
            </div>

            <button
              className="pp-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </div>
    </main>
  );
};

export default ProductsPage;
