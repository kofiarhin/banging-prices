import "./how-it-works.styles.scss";

const HowItWorks = () => {
  return (
    <section className="pp-how">
      <div className="pp-how-head">
        <span>How it works</span>
        <h3>We filter the sale noise before it reaches the feed.</h3>
      </div>

      <div className="pp-how-steps">
        <div className="pp-step">
          <span className="pp-step-k">SCAN</span>
          <p>Continuous monitoring across active UK retail catalogues.</p>
        </div>

        <div className="pp-step">
          <span className="pp-step-k">VERIFY</span>
          <p>Prices are compared over time to catch inflated discounts.</p>
        </div>

        <div className="pp-step">
          <span className="pp-step-k">SURFACE</span>
          <p>Only useful drops are pushed into the homepage feed.</p>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
