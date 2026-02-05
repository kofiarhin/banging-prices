import { Link } from "react-router-dom";
import "./sections.styles.scss";

const Sections = ({
  sections = [],
  isLoading = false,
  isError = false,
  renderItem,
  getItemKey,
  loadingUI,
  errorUI,
  emptyUI,
  className = "",
}) => {
  const safeSections = Array.isArray(sections) ? sections : [];
  const keyFn =
    typeof getItemKey === "function"
      ? getItemKey
      : (item) => item?._id || item?.id || JSON.stringify(item);

  if (isError)
    return errorUI || <div className="pp-sections-error">Failed to load.</div>;
  if (isLoading)
    return loadingUI || <div className="pp-sections-loading">Loading…</div>;
  if (safeSections.length === 0)
    return emptyUI || <div className="pp-sections-empty">Nothing to show.</div>;

  return (
    <section className={`pp-sections ${className}`.trim()}>
      {safeSections.map((sec) => (
        <div key={sec.id || sec.title} className="pp-section">
          <div className="pp-section-head">
            <div className="pp-section-titlewrap">
              {sec.image ? (
                <img
                  className="pp-section-cover"
                  src={sec.image}
                  alt={sec.title || "Section"}
                  loading="lazy"
                />
              ) : null}
              <h3 className="pp-section-title">{sec.title}</h3>
              {sec.subtitle ? (
                <p className="pp-section-subtitle">{sec.subtitle}</p>
              ) : null}
            </div>

            {sec.seeAllUrl ? (
              <Link className="pp-seeall" to={sec.seeAllUrl}>
                See all <span className="pp-seeall-arrow">→</span>
              </Link>
            ) : null}
          </div>

          <div className="pp-strip">
            {(sec.items || []).map((item) => (
              <div key={keyFn(item)} className="pp-strip-item">
                {renderItem ? renderItem(item) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
};

export default Sections;
