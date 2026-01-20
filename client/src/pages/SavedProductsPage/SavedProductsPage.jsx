import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import "./saved-products.styles.scss";

const formatMoney = (currency, value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return `${currency} ${value}`;
  return `${currency}${n.toFixed(2)}`;
};

const SavedProductsPage = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [data, setData] = useState([]);

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
