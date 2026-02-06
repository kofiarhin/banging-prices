import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import "./saved-products.styles.scss";
import useDeleteProduct from "../../hooks/useDeleteProduct";
import useCollectionsQuery from "../../hooks/useCollectionsQuery";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const formatMoney = (currency, value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return `${currency} ${value}`;
  return `${currency}${n.toFixed(2)}`;
};

const normalize = (v) =>
  String(v || "")
    .toLowerCase()
    .trim();

const SavedProductsPage = () => {
  const { mutate, isPending } = useDeleteProduct();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [data, setData] = useState([]);
  const [token, setToken] = useState("");

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("recent"); // recent | price-asc | price-desc | instock

  // keep query so existing hook remains usable (even if you hide UI)
  useCollectionsQuery(token);

  const handleDelete = async (productId) => {
    if (!productId) return;
    const t = await getToken();

    mutate(
      { productId, token: t },
      {
        onSuccess: () => {
          setData((prev) =>
            prev.filter((d) => d?.productId?._id !== productId),
          );
        },
      },
    );
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setToken("");
      return;
    }

    (async () => {
      const t = await getToken();
      setToken(t || "");
    })();
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!token) return;

    const getSavedProducts = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products/saved`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const resData = await res.json().catch(() => []);
        if (!res.ok) throw new Error(resData?.message || "Failed to fetch");

        setData(Array.isArray(resData) ? resData : []);
      } catch (error) {
        console.error(error.message);
        setData([]);
      }
    };

    getSavedProducts();
  }, [token]);

  const filtered = useMemo(() => {
    const q = normalize(search);

    let list = data.filter((saveDoc) => {
      const p = saveDoc?.productId;
      if (!p) return false;

      if (!q) return true;

      const haystack = [p.title, p.storeName, p.currency, p.price]
        .filter(Boolean)
        .join(" ");

      return normalize(haystack).includes(q);
    });

    if (sortKey === "price-asc") {
      list = list.slice().sort((a, b) => {
        const ap = Number(a?.productId?.price);
        const bp = Number(b?.productId?.price);
        if (Number.isNaN(ap) && Number.isNaN(bp)) return 0;
        if (Number.isNaN(ap)) return 1;
        if (Number.isNaN(bp)) return -1;
        return ap - bp;
      });
    }

    if (sortKey === "price-desc") {
      list = list.slice().sort((a, b) => {
        const ap = Number(a?.productId?.price);
        const bp = Number(b?.productId?.price);
        if (Number.isNaN(ap) && Number.isNaN(bp)) return 0;
        if (Number.isNaN(ap)) return 1;
        if (Number.isNaN(bp)) return -1;
        return bp - ap;
      });
    }

    if (sortKey === "instock") {
      list = list.slice().sort((a, b) => {
        const ai = a?.productId?.inStock ? 1 : 0;
        const bi = b?.productId?.inStock ? 1 : 0;
        return bi - ai;
      });
    }

    return list; // recent keeps API order
  }, [data, search, sortKey]);

  return (
    <main className="saved-page">
      <div className="saved-top">
        <div className="saved-head">
          <h1 className="saved-title">Saved Items</h1>
          <p className="saved-sub">{data.length} saved</p>
        </div>

        <div className="saved-toolbar">
          <div className="saved-search">
            <span className="saved-search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              className="saved-search-input"
              placeholder="Search saved items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
            />
          </div>

          <div className="saved-filters">
            <select
              className="saved-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              <option value="recent">Recently saved</option>
              <option value="instock">In stock first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>

            <button
              className="saved-ghost-btn"
              type="button"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <section className="saved-list">
        {filtered.length === 0 ? (
          <div className="saved-empty">
            <p className="saved-empty-title">No saved items</p>
            <p className="saved-empty-sub">
              Save products to see them listed here.
            </p>
          </div>
        ) : (
          filtered.map((saveDoc) => {
            const p = saveDoc?.productId;
            if (!p) return null;

            return (
              <Link
                key={saveDoc._id}
                to={`/products/${p._id}`}
                className="saved-row"
              >
                <div className="saved-thumb">
                  <img src={p.image} alt={p.title} loading="lazy" />
                </div>

                <div className="saved-main">
                  <div className="saved-row-title">{p.title}</div>
                  <div className="saved-row-meta">
                    <span className="saved-meta-pill">
                      {p.storeName || "Retailer"}
                    </span>
                    <span
                      className={`saved-meta-pill ${p.inStock ? "is-good" : "is-bad"}`}
                    >
                      {p.inStock ? "In stock" : "Out of stock"}
                    </span>
                  </div>
                </div>

                <div className="saved-right">
                  <div className="saved-price">
                    {formatMoney(p.currency || "£", p.price)}
                  </div>

                  <button
                    type="button"
                    className="saved-danger-btn"
                    disabled={isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(p._id);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </main>
  );
};

export default SavedProductsPage;
