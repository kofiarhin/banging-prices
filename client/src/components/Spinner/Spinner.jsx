import "./spinner.styles.scss";

const Spinner = ({
  label = "SYNCING",
  sub = "PRICE INTEL",
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
        <div className="bp-cod-spinner__noise" aria-hidden="true" />
        <div className="bp-cod-spinner__vignette" aria-hidden="true" />

        <div className="bp-cod-spinner__content">
          <div className="bp-cod-spinner__title" data-text={label}>
            {label}
          </div>

          <div className="bp-cod-spinner__sub">{sub}</div>

          <div className="bp-cod-spinner__meter" aria-hidden="true">
            <div className="bp-cod-spinner__meter-track" />
            <div className="bp-cod-spinner__meter-sweep" />
            <div className="bp-cod-spinner__meter-ticks" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Spinner;
