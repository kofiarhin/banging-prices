import "./spinner.styles.scss";

const Spinner = ({
  label = "SYNCING PRICE INTEL",
  sub = "DO NOT CLOSE • LIVE OPS ACTIVE",
  fullscreen = true,
  className = "",
}) => {
  return (
    <div
      className={[
        "bp-cod-spinner",
        fullscreen ? "bp-cod-spinner--fullscreen" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="bp-cod-spinner__bg" aria-hidden="true" />

      <div className="bp-cod-spinner__hud">
        <div className="bp-cod-spinner__frame" aria-hidden="true" />
        <div className="bp-cod-spinner__sweep" aria-hidden="true" />
        <div className="bp-cod-spinner__noise" aria-hidden="true" />

        <div className="bp-cod-spinner__content">
          <div className="bp-cod-spinner__title" data-text={label}>
            {label}
          </div>

          <div className="bp-cod-spinner__row">
            <div className="bp-cod-spinner__pill">
              <span className="bp-cod-spinner__dot" />
              LIVE
            </div>
            <div className="bp-cod-spinner__sub">{sub}</div>
          </div>

          <div className="bp-cod-spinner__bar" aria-hidden="true">
            <div className="bp-cod-spinner__bar-fill" />
          </div>

          <div className="bp-cod-spinner__hint">
            HOLD STEADY — INTERCEPTING DROPS
            <span className="bp-cod-spinner__dots" aria-hidden="true">
              ...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Spinner;
