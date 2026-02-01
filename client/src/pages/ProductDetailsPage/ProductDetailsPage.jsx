import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import "./product-details.styles.scss";
import useSaveMutation from "../../hooks/useSaveMutation";
import useSavedProductsQuery from "../../hooks/useSavedProductsQuery";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const formatMoney = (currency, value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return `${currency} ${value}`;
  return `${currency} ${n.toFixed(2)}`;
};

const formatTimeAgo = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const fetchProductById = async (id) => {
  const res = await fetch(`${API_URL}/api/products/${id}`);
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
};

const fetchSimilar = async (p) => {
  const params = new URLSearchParams({
    status: "active",
    inStock: "true",
    limit: "8",
    sort: "discount-desc",
  });

  if (p?.category) params.set("category", p.category);
  if (p?.gender) params.set("gender", p.gender);

  const res = await fetch(`${API_URL}/api/products?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch similar items");
  const data = await res.json();
  return data?.items || [];
};

const createAlert = async ({ token, payload }) => {
  const res = await fetch(`${API_URL}/api/alerts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to activate tracker");
  return data;
};

const normalizeSizes = (p) => {
  const raw =
    p?.sizes ??
    p?.availableSizes ??
    p?.sizeOptions ??
    p?.size ??
    p?.variants?.sizes ??
    p?.variants ??
    [];

  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((v) => ({ label: v, inStock: true }));
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) return [];
    if (typeof raw[0] === "string") {
      return raw
        .map((s) => String(s).trim())
        .filter(Boolean)
        .map((v) => ({ label: v, inStock: true }));
    }
    if (typeof raw[0] === "object" && raw[0] !== null) {
      return raw
        .map((x) => {
          const label =
            x?.label ?? x?.size ?? x?.name ?? x?.value ?? x?.title ?? "";
          if (!label) return null;

          const inStock =
            typeof x?.inStock === "boolean"
              ? x.inStock
              : typeof x?.available === "boolean"
                ? x.available
                : typeof x?.isAvailable === "boolean"
                  ? x.isAvailable
                  : true;

          return { label: String(label).trim(), inStock };
        })
        .filter(Boolean);
    }
  }

  return [];
};

const ProductDetailsPage = () => {
  const { id } = useParams();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const qc = useQueryClient();
  const { mutate, isPending } = useSaveMutation();

  const [activeIdx, setActiveIdx] = useState(0);
  const [shareDone, setShareDone] = useState(false);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState("price");
  const [targetPrice, setTargetPrice] = useState("");
  const [targetPercent, setTargetPercent] = useState("10");
  const [alertSaved, setAlertSaved] = useState(false);
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertError, setAlertError] = useState("");

  const [token, setToken] = useState("");

  const [shouldRedirectToSignIn, setShouldRedirectToSignIn] = useState(false);

  // ✅ sizes collapse/expand
  const [sizesExpanded, setSizesExpanded] = useState(false);

  const startXRef = useRef(null);
  const isDraggingRef = useRef(false);

  const {
    data: p,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProductById(id),
    enabled: !!id,
  });

  const { data: similarItems = [] } = useQuery({
    queryKey: ["similar", p?._id],
    queryFn: () => fetchSimilar(p),
    enabled: !!p?._id,
  });

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setToken("");
      return;
    }
    (async () => {
      const t = await getToken();
      setToken(t || "");
    })();
  }, [isLoaded, isSignedIn, getToken]);

  const { data: savedList = [] } = useSavedProductsQuery(token);

  const isAlreadySaved = useMemo(() => {
    if (!id) return false;
    return (savedList || []).some((d) => d?.productId?._id === id);
  }, [savedList, id]);

  useEffect(() => {
    setActiveIdx(0);
    setShareDone(false);

    setAlertOpen(false);
    setAlertType("price");
    setAlertSaved(false);
    setAlertSaving(false);
    setAlertError("");
    setShouldRedirectToSignIn(false);

    // ✅ reset sizes UI per product
    setSizesExpanded(false);
  }, [p?._id]);

  const gallery = useMemo(() => {
    if (!p) return [];
    return Array.from(new Set([p.image, ...(p.images || [])])).filter(Boolean);
  }, [p]);

  const sizes = useMemo(() => normalizeSizes(p), [p]);
  const hasSizes = (sizes || []).length > 0;

  // ✅ Option A: collapse + “+N more”
  const SIZE_LIMIT = 12;
  const sizesToRender = useMemo(() => {
    if (!hasSizes) return [];
    if (sizesExpanded) return sizes;
    return sizes.slice(0, SIZE_LIMIT);
  }, [sizes, hasSizes, sizesExpanded]);

  const remainingCount = useMemo(() => {
    if (!hasSizes) return 0;
    return Math.max(0, sizes.length - SIZE_LIMIT);
  }, [sizes, hasSizes]);

  const activeImageUrl = gallery[activeIdx] || p?.image;
  const canCarousel = (gallery || []).length > 1;

  const goPrev = () => {
    if (!canCarousel) return;
    setActiveIdx((i) => (i - 1 + gallery.length) % gallery.length);
  };

  const goNext = () => {
    if (!canCarousel) return;
    setActiveIdx((i) => (i + 1) % gallery.length);
  };

  const onPointerDown = (e) => {
    if (!canCarousel) return;
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
  };

  const onPointerMove = () => {
    if (!canCarousel) return;
    if (!isDraggingRef.current) return;
  };

  const onPointerUp = (e) => {
    if (!canCarousel) return;
    if (!isDraggingRef.current) return;

    const startX = startXRef.current;
    const endX = e.clientX;

    isDraggingRef.current = false;
    startXRef.current = null;

    if (typeof startX !== "number" || typeof endX !== "number") return;

    const dx = endX - startX;
    const threshold = 40;

    if (dx > threshold) goPrev();
    if (dx < -threshold) goNext();
  };

  const onKeyDown = (e) => {
    if (!canCarousel) return;
    if (e.key === "ArrowLeft") goPrev();
    if (e.key === "ArrowRight") goNext();
  };

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareDone(true);
      setTimeout(() => setShareDone(false), 2000);
    } catch (err) {
      console.error("Clipboard failed", err);
    }
  };

  const saveAlert = async () => {
    if (!isLoaded || !isSignedIn) return;

    try {
      setAlertError("");
      setAlertSaving(true);

      const t = token || (await getToken());
      if (!t) throw new Error("Missing auth token");

      const payload = { productId: p._id, type: alertType };

      if (alertType === "price") {
        const n = Number(targetPrice);
        if (!Number.isFinite(n)) throw new Error("Enter a valid price");
        payload.targetPrice = n;
      }

      if (alertType === "percent") {
        const n = Number(targetPercent);
        if (!Number.isFinite(n) || n <= 0)
          throw new Error("Enter a valid percent");
        payload.targetPercent = n;
      }

      await createAlert({ token: t, payload });

      setAlertSaved(true);
      setTimeout(() => {
        setAlertSaved(false);
        setAlertOpen(false);
      }, 1200);
    } catch (e) {
      setAlertError(e?.message || "Failed to activate tracker");
    } finally {
      setAlertSaving(false);
    }
  };

  const handleSave = async () => {
    if (!isLoaded || !isSignedIn) {
      setShouldRedirectToSignIn(true);
      return;
    }

    if (isAlreadySaved) return;

    const t = token || (await getToken());
    if (!t) {
      console.error(
        "Clerk token is empty. Configure a JWT template in Clerk OR pass a template to getToken({ template: 'YOUR_TEMPLATE' }).",
      );
      return;
    }

    mutate(
      { id, token: t },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["saved-products"] });
        },
      },
    );
  };

  if (shouldRedirectToSignIn) {
    return <RedirectToSignIn />;
  }

  if (isLoading) return <div className="pd-state">Syncing PricePulse...</div>;
  if (isError) return <div className="pd-state">{error.message}</div>;
  if (!p) return <div className="pd-state">Listing unavailable.</div>;

  const discount =
    p.originalPrice && p.price
      ? Math.round(
          ((Number(p.originalPrice) - Number(p.price)) /
            Number(p.originalPrice)) *
            100,
        )
      : p.discountPercent;

  return (
    <div className="pd-page">
      <nav className="pd-top">
        <div className="pd-container pd-top-inner">
          <Link className="pd-back" to="/products">
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Feed</span>
          </Link>

          <div className="pd-top-actions">
            <button
              className="pd-icon-btn"
              onClick={onShare}
              title="Share deal"
              aria-label="Share deal"
              type="button"
            >
              <span className="material-symbols-outlined">share</span>
            </button>

            {!isAlreadySaved && (
              <button
                className="pd-icon-btn"
                onClick={handleSave}
                title="Save"
                aria-label="Save"
                disabled={!isLoaded || isPending}
                type="button"
              >
                <span className="material-symbols-outlined">
                  favorite_border
                </span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {shareDone && <div className="pd-toast">Link copied to clipboard</div>}

      <div className="pd-container">
        <div className="pd-layout">
          <section className="pd-media" aria-label="Product media">
            <div className="pd-media-grid">
              <div
                className="pd-main pd-main-carousel"
                tabIndex={0}
                role="region"
                aria-label="Product image carousel"
                onKeyDown={onKeyDown}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <div
                  className="pd-main-bg"
                  aria-hidden="true"
                  style={{ backgroundImage: `url(${activeImageUrl})` }}
                />
                <div className="pd-main-overlay" aria-hidden="true" />

                <img
                  className="pd-main-img"
                  src={activeImageUrl}
                  alt={p.title}
                  loading="eager"
                  draggable={false}
                />

                {discount > 0 ? (
                  <div className="pd-media-discount">-{discount}%</div>
                ) : null}

                {canCarousel ? (
                  <>
                    <button
                      className="pd-carousel-btn is-prev"
                      onClick={goPrev}
                      aria-label="Previous image"
                      type="button"
                    >
                      <span className="material-symbols-outlined">
                        chevron_left
                      </span>
                    </button>

                    <button
                      className="pd-carousel-btn is-next"
                      onClick={goNext}
                      aria-label="Next image"
                      type="button"
                    >
                      <span className="material-symbols-outlined">
                        chevron_right
                      </span>
                    </button>

                    <div className="pd-dots" aria-label="Carousel navigation">
                      {gallery.map((_, idx) => (
                        <button
                          key={`dot-${idx}`}
                          className={`pd-dot ${idx === activeIdx ? "is-active" : ""}`}
                          onClick={() => setActiveIdx(idx)}
                          aria-label={`Go to image ${idx + 1}`}
                          type="button"
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </section>

          <aside className="pd-panel" aria-label="Product details">
            <div className="pd-head">
              <h1 className="pd-title">{p.title}</h1>

              <div className="pd-chips">
                <span className="pd-chip pd-chip-strong">
                  {p.storeName || p.store || "Retailer"}
                </span>

                <span className={`pd-chip ${p.inStock ? "is-good" : "is-bad"}`}>
                  {p.inStock ? "In Stock" : "Out of Stock"}
                </span>

                <span className="pd-chip pd-chip-muted">
                  Updated {formatTimeAgo(p.lastSeenAt)}
                </span>
              </div>
            </div>

            <div className="pd-price-card">
              <div className="pd-price-row">
                <div className="pd-price">
                  <span className="pd-price-now">
                    {formatMoney(p.currency, p.price)}
                  </span>

                  {p.originalPrice ? (
                    <span className="pd-price-was">
                      {formatMoney(p.currency, p.originalPrice)}
                    </span>
                  ) : null}
                </div>

                {discount > 0 ? (
                  <span className="pd-discount-tag">Save {discount}%</span>
                ) : (
                  <span className="pd-discount-tag is-neutral">
                    No discount
                  </span>
                )}
              </div>

              <div className="pd-meta-inline">
                <div className="pd-meta-pill">
                  <span className="pd-meta-pill-label">Category</span>
                  <span className="pd-meta-pill-value">
                    {p.category || "General"}
                  </span>
                </div>

                <div className="pd-meta-pill">
                  <span className="pd-meta-pill-label">Gender</span>
                  <span className="pd-meta-pill-value">
                    {p.gender || "Unisex"}
                  </span>
                </div>

                <div className="pd-meta-pill">
                  <span className="pd-meta-pill-label">ID</span>
                  <span className="pd-meta-pill-value">
                    #{(p._id || "").slice(-6)}
                  </span>
                </div>
              </div>

              <div className="pd-sizes">
                <div className="pd-sizes-head">
                  <span className="pd-sizes-label">Sizes</span>
                  {!hasSizes ? (
                    <span className="pd-sizes-muted">Not listed</span>
                  ) : null}
                </div>

                {hasSizes ? (
                  <div className="pd-sizes-grid" aria-label="Available sizes">
                    {sizesToRender.slice(0, 200).map((s, idx) => (
                      <span
                        key={`${s.label}-${idx}`}
                        className={`pd-size-chip ${s.inStock ? "" : "is-unavailable"}`}
                        title={s.inStock ? "Available" : "Unavailable"}
                      >
                        {s.label}
                      </span>
                    ))}

                    {!sizesExpanded && remainingCount > 0 ? (
                      <button
                        className="pd-size-chip pd-size-more"
                        type="button"
                        onClick={() => setSizesExpanded(true)}
                        aria-label={`Show ${remainingCount} more sizes`}
                        title="Show all sizes"
                      >
                        +{remainingCount} more
                      </button>
                    ) : null}

                    {sizesExpanded && sizes.length > SIZE_LIMIT ? (
                      <button
                        className="pd-size-chip pd-size-more"
                        type="button"
                        onClick={() => setSizesExpanded(false)}
                        aria-label="Collapse sizes"
                        title="Show fewer sizes"
                      >
                        Show less
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="pd-cta">
              <a
                className="pd-btn pd-btn-primary"
                href={p.productUrl}
                target="_blank"
                rel="noreferrer"
              >
                View on Store
              </a>

              <button
                className="pd-btn pd-btn-secondary"
                onClick={() => {
                  if (!isLoaded || !isSignedIn) {
                    setShouldRedirectToSignIn(true);
                    return;
                  }

                  setAlertError("");
                  setAlertSaved(false);
                  setAlertOpen(true);
                  setAlertType("price");
                  setTargetPrice(p.price);
                }}
                type="button"
              >
                Monitor Price
              </button>

              <button
                className="pd-btn pd-btn-ghost"
                onClick={() =>
                  qc.invalidateQueries({ queryKey: ["product", id] })
                }
                type="button"
              >
                Refresh Deal
              </button>
            </div>

            <div className="pd-divider" />
          </aside>
        </div>
      </div>

      <section className="pd-similar">
        <div className="pd-container">
          <h2 className="pd-section-title">Similar Drops</h2>
          <p className="pd-section-sub">
            Deals you might have missed in {p.category || "this category"}
          </p>

          <div className="pd-similar-grid">
            {similarItems
              .filter((x) => x._id !== p._id)
              .slice(0, 4)
              .map((x) => (
                <Link key={x._id} to={`/products/${x._id}`} className="pd-card">
                  <div className="pd-card-img">
                    <img src={x.image} alt={x.title} loading="lazy" />
                    {x.discountPercent ? (
                      <span className="pd-card-badge">
                        -{x.discountPercent}%
                      </span>
                    ) : null}
                  </div>

                  <div className="pd-card-body">
                    <div className="pd-card-title">{x.title}</div>
                    <div className="pd-card-now">
                      {formatMoney(x.currency, x.price)}
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {alertOpen && (
        <div
          className="pd-modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setAlertOpen(false)}
        >
          <div className="pd-modal" role="dialog" aria-modal="true">
            <div className="pd-modal-head">
              <h3 className="pd-modal-title">Track Pricing</h3>
              <button
                className="pd-icon-btn"
                onClick={() => setAlertOpen(false)}
                aria-label="Close"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="pd-modal-tabs">
              {["price", "percent", "stock"].map((t) => (
                <button
                  key={t}
                  className={`pd-tab ${alertType === t ? "is-active" : ""}`}
                  onClick={() => {
                    setAlertType(t);
                    setAlertError("");
                    setAlertSaved(false);
                    if (t === "price") setTargetPrice(p.price);
                  }}
                  type="button"
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="pd-modal-body">
              {alertType === "price" && (
                <div className="pd-field">
                  <label className="pd-label">Notify me when price hits:</label>
                  <div className="pd-input-row">
                    <span className="pd-prefix">{p.currency}</span>
                    <input
                      className="pd-input"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      type="number"
                      inputMode="decimal"
                    />
                  </div>
                </div>
              )}

              {alertType === "percent" && (
                <div className="pd-field">
                  <label className="pd-label">Notify on drop of:</label>
                  <div className="pd-input-row">
                    <input
                      className="pd-input"
                      value={targetPercent}
                      onChange={(e) => setTargetPercent(e.target.value)}
                      type="number"
                      inputMode="numeric"
                      min="1"
                    />
                    <span className="pd-suffix">%</span>
                  </div>
                </div>
              )}

              {alertType === "stock" && (
                <p className="pd-hint">
                  We&apos;ll ping you as soon as inventory is detected.
                </p>
              )}
            </div>

            <button
              className="pd-btn pd-btn-primary"
              onClick={saveAlert}
              type="button"
              disabled={alertSaving}
            >
              {alertSaving ? "Activating..." : "Activate Tracker"}
            </button>

            {alertSaved && (
              <div className="pd-toast-inline">Tracker Active</div>
            )}
            {alertError && <div className="pd-toast-inline">{alertError}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailsPage;
