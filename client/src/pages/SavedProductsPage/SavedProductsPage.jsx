import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import "./saved-products.styles.scss";
import useDeleteProduct from "../../hooks/useDeleteProduct";

const formatMoney = (currency, value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return `${currency} ${value}`;
  return `${currency}${n.toFixed(2)}`;
};

const SavedProductsPage = () => {
  const { mutate, isPending } = useDeleteProduct();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [data, setData] = useState([]);

  const handleDelete = async (productId) => {
    if (!productId) return;

    const token = await getToken();

    mutate(
      { productId, token },
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
    if (!isLoaded || !isSignedIn) return;

    const getSavedProducts = async () => {
      try {
        const token = await getToken();
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  }, [getToken, isLoaded, isSignedIn]);

  return (
    <main className="saved-page">
      <header className="saved-header">
        <h1 className="saved-title">Your Collection</h1>
        <p className="saved-sub">{data.length} curated items found</p>
      </header>

      <div className="saved-grid">
        {data.map((saveDoc) => {
          const p = saveDoc.productId;
          if (!p) return null;

          return (
            <Link
              key={saveDoc._id}
              to={`/products/${p._id}`}
              className="saved-card"
            >
              <button
                type="button"
                className="saved-delete"
                aria-label="Remove from saved"
                title="Remove"
                disabled={isPending}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(p._id);
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 7h2v9h-2v-9zm4 0h2v9h-2v-9zM6 8h12l-1 13H7L6 8z"
                  />
                </svg>
              </button>

              <div className="saved-card-img">
                <img src={p.image} alt={p.title} loading="lazy" />
                {!p.inStock && (
                  <span className="sold-out-badge">Out of Stock</span>
                )}
              </div>

              <div className="saved-card-body">
                <span className="saved-card-price">
                  {formatMoney(p.currency || "£", p.price)}
                </span>
                <h2 className="saved-card-title">{p.title}</h2>
                <div className="saved-card-meta">
                  <span className="saved-chip">
                    {p.storeName || "Retailer"}
                  </span>
                  <span
                    className={`saved-chip ${p.inStock ? "is-good" : "is-bad"}`}
                  >
                    {p.inStock ? "Ready to buy" : "Sold out"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
};

export default SavedProductsPage;
