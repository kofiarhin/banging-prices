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

const SavedProductsPage = () => {
  const { mutate, isPending } = useDeleteProduct();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [data, setData] = useState([]);
  const [token, setToken] = useState("");
  const [newCollection, setNewCollection] = useState("");
  const [activeCollection, setActiveCollection] = useState("all");

  const { data: collections = [], refetch: refetchCollections } =
    useCollectionsQuery(token);

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

  const grouped = useMemo(() => {
    const map = new Map();

    data.forEach((item) => {
      const collectionId = item?.collectionId?._id || "unsorted";
      const collectionName = item?.collectionId?.name || "Unsorted";
      if (!map.has(collectionId)) {
        map.set(collectionId, { name: collectionName, items: [] });
      }
      map.get(collectionId).items.push(item);
    });

    return [...map.entries()].map(([id, payload]) => ({
      id,
      name: payload.name,
      items: payload.items,
    }));
  }, [data]);

  const collectionMap = useMemo(() => {
    const map = new Map();
    collections.forEach((c) => {
      map.set(c._id, c);
    });
    return map;
  }, [collections]);

  const visibleGroups =
    activeCollection === "all"
      ? grouped
      : grouped.filter((g) => g.id === activeCollection);

  const handleCreateCollection = async () => {
    const name = String(newCollection || "").trim();
    if (!name || !token) return;

    const res = await fetch(`${API_URL}/api/collections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(payload.message || "Failed to create collection");
      return;
    }

    setNewCollection("");
    refetchCollections();
  };

  const handleMoveCollection = async (saveId, collectionId) => {
    if (!token || !saveId) return;

    const res = await fetch(`${API_URL}/api/products/saved-item/${saveId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ collectionId }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(payload.message || "Failed to update collection");
      return;
    }

    setData((prev) =>
      prev.map((item) =>
        item._id === saveId ? payload.savedItem : item,
      ),
    );
  };

  return (
    <main className="saved-page">
      <header className="saved-header">
        <h1 className="saved-title">Your Collection</h1>
        <p className="saved-sub">{data.length} curated items found</p>
      </header>

      <section className="saved-controls">
        <div className="saved-collections">
          <button
            className={`saved-chip ${activeCollection === "all" ? "is-active" : ""}`}
            type="button"
            onClick={() => setActiveCollection("all")}
          >
            All
          </button>
          {collections.map((c) => (
            <button
              key={c._id}
              className={`saved-chip ${activeCollection === c._id ? "is-active" : ""}`}
              type="button"
              onClick={() => setActiveCollection(c._id)}
            >
              {c.name} ({c.count || 0})
            </button>
          ))}
          <button
            className="saved-chip saved-chip-secondary"
            type="button"
            onClick={() => {
              if (token) refetchCollections();
            }}
          >
            Refresh
          </button>
        </div>

        <div className="saved-new-collection">
          <input
            className="saved-input"
            placeholder="New collection name"
            value={newCollection}
            onChange={(e) => setNewCollection(e.target.value)}
            type="text"
          />
          <button
            className="saved-btn"
            type="button"
            onClick={handleCreateCollection}
          >
            Create
          </button>
        </div>
      </section>

      <div className="saved-grid">
        {visibleGroups.map((group) => {
          const collection = collectionMap.get(group.id);
          const shareId = collection?.shareId;

          return (
            <div key={group.id} className="saved-group">
              <div className="saved-group-title">
                <span>{group.name}</span>
                {shareId ? (
                  <button
                    className="saved-share"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const url = `${window.location.origin}/collections/${shareId}`;
                      navigator.clipboard?.writeText(url);
                    }}
                  >
                    Copy Share Link
                  </button>
                ) : null}
              </div>
              <div className="saved-group-grid">
                {group.items.map((saveDoc) => {
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
                        <div className="saved-move">
                          <label
                            className="saved-move-label"
                            htmlFor={saveDoc._id}
                          >
                            Collection
                          </label>
                          <select
                            id={saveDoc._id}
                            className="saved-select"
                            value={saveDoc?.collectionId?._id || ""}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleMoveCollection(
                                saveDoc._id,
                                e.target.value || null,
                              );
                            }}
                          >
                            <option value="">Unsorted</option>
                            {collections.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
};

export default SavedProductsPage;
