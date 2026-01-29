import React, { useMemo } from "react";
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

const ProductsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const category = params.get("category") || "HOODIES-SWEATSHIRTS";
  const sort = params.get("sort") || "newest";

  const { data, isLoading } = useQuery({
    queryKey: ["products", location.search],
    queryFn: () => fetchProducts(Object.fromEntries(params)),
    keepPreviousData: true,
  });

  const setParam = (updates) => {
    const next = new URLSearchParams(location.search);
    Object.entries(updates).forEach(([k, v]) => {
      v ? next.set(k, String(v)) : next.delete(k);
    });
    navigate(`/products?${next.toString()}`);
  };

  const items = data?.items || [];

  return (
    <main className="pp-products">
      <div className="pp-container">
        <header className="pp-toolbar">
          <h1 className="pp-category-title">{category}</h1>
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
        </header>

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
                    <img
                      src={p.image}
                      alt={p.title}
                      className="pp-image"
                      loading="lazy"
                    />
                    <button
                      className="pp-wishlist-btn"
                      aria-label="Add to wishlist"
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
                    <h3 className="pp-product-title">{p.title}</h3>
                    <div className="pp-price-row">
                      <span className="pp-price">
                        {p.currency}
                        {p.price}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </main>
  );
};

export default ProductsPage;
