import "./how-it-works.styles.scss";

const HowItWorks = () => {
  return (
    <section className="pp-how">
      <div className="pp-how-head">
        <h3>How we track real price drops</h3>
      </div>

      <div className="pp-how-steps">
        <div className="pp-step">
          <span className="pp-step-k">SCAN</span>
          <p>Continuous monitoring across UK retailers.</p>
        </div>

        <div className="pp-step">
          <span className="pp-step-k">VERIFY</span>
          <p>
            Prices compared over time to filter fake sales and inflated
            discounts.
          </p>
        </div>

        <div className="pp-step">
          <span className="pp-step-k">SURFACE</span>
          <p>Only genuine price drops appear — live.</p>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
