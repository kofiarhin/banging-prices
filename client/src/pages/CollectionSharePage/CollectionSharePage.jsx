import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import "./collection-share.styles.scss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const fetchSharedCollection = async (shareId) => {
  const res = await fetch(`${API_URL}/api/collections/${shareId}`);
  const payload = await res.json();
  if (!res.ok) throw new Error(payload?.message || "Collection not found");
  return payload;
};

const CollectionSharePage = () => {
  const { shareId } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["shared-collection", shareId],
    queryFn: () => fetchSharedCollection(shareId),
    enabled: !!shareId,
  });

  if (isLoading) return <div className="cs-state">Loading collection...</div>;
  if (isError) return <div className="cs-state">{error.message}</div>;

  const collection = data?.collection;
  const items = data?.items || [];

  return (
    <main className="cs-page">
      <div className="cs-container">
        <header className="cs-header">
          <h1 className="cs-title">{collection?.name || "Shared List"}</h1>
          <p className="cs-sub">{items.length} items</p>
        </header>

        <div className="cs-grid">
          {items.map((saveDoc) => {
            const p = saveDoc?.productId;
            if (!p) return null;

            return (
              <Link
                key={saveDoc._id}
                to={`/products/${p._id}`}
                className="cs-card"
              >
                <div className="cs-card-img">
                  <img src={p.image} alt={p.title} loading="lazy" />
                </div>
                <div className="cs-card-body">
                  <div className="cs-card-title">{p.title}</div>
                  <div className="cs-card-meta">
                    {p.currency}
                    {p.price} · {p.storeName || p.store}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default CollectionSharePage;
