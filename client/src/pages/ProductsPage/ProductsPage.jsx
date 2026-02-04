import React, { useEffect, useMemo, useRef } from "react";
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

const formatTimeAgo = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

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

const toCategorySlugFromQuery = (qRaw) => {
  const q = String(qRaw || "")
    .trim()
    .toLowerCase();
  if (!q) return "";
  return q
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const ProductsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const lastResolvedQ = useRef("");

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  // ✅ standardize: q is the only search param (support legacy search/q just in case)
  const q = params.get("q") || params.get("search") || "";
  const sort = params.get("sort") || "newest";

  const gender = params.get("gender") || "";
  const category = params.get("category") || "";
  const store = params.get("store") || "";
  const page = Number(params.get("page") || 1);

  const pageTitle = q
    ? `SEARCH: ${String(q).trim().toUpperCase()}`
    : titleFromCategory(category);

  const setParam = (updates) => {
    const next = new URLSearchParams(location.search);

    // if legacy 'search' exists, normalize away from it
    if (next.has("search") && !next.has("q")) {
      next.set("q", next.get("search") || "");
    }
    next.delete("search");

    Object.entries(updates).forEach(([k, v]) => {
      if (v === 0) return next.set(k, "0");
      if (v === null || v === undefined || v === "") return next.delete(k);
      next.set(k, String(v));
    });

    navigate(`/products?${next.toString()}`);
  };

  // ✅ FLOW: gender -> category -> store (while preserving q)
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

    // normalize legacy
    if (obj.search && !obj.q) obj.q = obj.search;
    delete obj.search;

    if (!obj.page) obj.page = "1";
    if (!obj.sort) obj.sort = "newest";
    if (!obj.limit) obj.limit = "24";

    return obj;
  }, [params]);

  // ✅ categories should load when gender OR search is active
  // include store so categories can reflect store filter if chosen
  const categoriesParams = useMemo(() => {
    const obj = Object.fromEntries(params);

    if (obj.search && !obj.q) obj.q = obj.search;
    delete obj.search;

    delete obj.category; // endpoint returns available categories
    delete obj.page;
    delete obj.limit;
    delete obj.sort;

    return obj;
  }, [params]);

  // ✅ stores depend on gender + category (+ q), not store
  const storesParams = useMemo(() => {
    const obj = Object.fromEntries(params);

    if (obj.search && !obj.q) obj.q = obj.search;
    delete obj.search;

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
    enabled: Boolean(gender || q),
  });

  const { data: storesData } = useQuery({
    queryKey: ["stores", storesParams],
    queryFn: () => fetchStores(storesParams),
    keepPreviousData: true,
    enabled: Boolean(category),
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

  // ✅ auto-set category when q strongly matches a category value
  useEffect(() => {
    const term = String(q || "").trim();
    if (!term) {
      lastResolvedQ.current = "";
      return;
    }

    if (category) return;

    // prevent loops / re-resolves for same q
    if (lastResolvedQ.current === term) return;

    const run = async () => {
      try {
        // resolve within current context (gender optional)
        const qs = new URLSearchParams();
        qs.set("q", term);
        if (gender) qs.set("gender", gender);

        const data = await fetchJson(
          `${API_URL}/api/products/categories?${qs}`,
        );
        const list = data?.categories || [];

        const wanted = toCategorySlugFromQuery(term);
        if (!wanted) return;

        const exists = list.some(
          (c) => String(c?.value || "").toLowerCase() === wanted,
        );

        if (exists) {
          lastResolvedQ.current = term;
          setParam({ category: wanted, page: 1 });
        } else {
          lastResolvedQ.current = term;
        }
      } catch (e) {
        lastResolvedQ.current = term;
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, gender, category]);

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
                  disabled={!(gender || q)}
                >
                  <option value="">
                    {gender || q
                      ? `ALL CATEGORIES${categoriesTotal ? ` (${categoriesTotal})` : ""}`
                      : "SEARCH OR SELECT GENDER FIRST"}
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
                  disabled={!category}
                >
                  <option value="">
                    {category
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

                    <div className="pp-meta-row">
                      <span className="pp-meta-pill">
                        Deal {p.dealScore || 0}
                      </span>
                      {p.lastSeenAt ? (
                        <span className="pp-meta-pill">
                          Seen {formatTimeAgo(p.lastSeenAt)}
                        </span>
                      ) : null}
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
