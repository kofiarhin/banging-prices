import "./section-skeleton.styles.scss";

const SectionSkeleton = ({ cards = 8, showSubtitle = true }) => {
  return (
    <div className="pp-section-skel">
      <div className="pp-section-skel-head">
        <div className="pp-section-skel-title" />
        {showSubtitle ? <div className="pp-section-skel-subtitle" /> : null}
        <div className="pp-section-skel-seeall" />
      </div>

      <div className="pp-strip-skel" aria-hidden="true">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="pp-card-skel">
            <div className="pp-card-skel-media" />
            <div className="pp-card-skel-details">
              <div className="pp-card-skel-line pp-w-40" />
              <div className="pp-card-skel-line pp-w-90" />
              <div className="pp-card-skel-line pp-w-60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionSkeleton;
