import "./spinner.styles.scss";

const Spinner = ({
  label = "Intercepting Live Drops...",
  fullscreen = true,
  className = "",
}) => {
  return (
    <div
      className={[
        "bp-radar-system",
        fullscreen ? "is-fullscreen" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="bp-radar-container">
        <div className="bp-radar-circle">
          <div className="bp-radar-sweep"></div>
          <div className="bp-radar-grid"></div>
        </div>

        <div className="bp-target-lock">
          <div className="corner top-left"></div>
          <div className="corner top-right"></div>
          <div className="corner bottom-left"></div>
          <div className="corner bottom-right"></div>

          <h1 className="bp-logo">BANGINGPRICES</h1>
          <div className="bp-scan-bar"></div>
        </div>

        <div className="bp-radar-status">
          <div className="bp-status-line">
            <span className="bp-code">ID: 0x4F2</span>
            <span className="bp-msg">{label}</span>
          </div>
          <div className="bp-loading-bar">
            <div className="bp-loading-fill"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Spinner;
