import { formatSecondsAgo } from "../../../utils/formatters";
import "./stats.styles.scss";

const Stats = ({ system = {} }) => {
  return (
    <section className="pp-live-stats">
      <div className="pp-stat">
        <div className="pp-stat-num">{Number(system.retailersOnline || 0)}</div>
        <div className="pp-stat-label">Retailers monitored</div>
      </div>

      <div className="pp-stat">
        <div className="pp-stat-num">{Number(system.assetsTracked || 0)}</div>
        <div className="pp-stat-label">Products tracked</div>
      </div>

      <div className="pp-stat">
        <div className="pp-stat-num">
          {formatSecondsAgo(system.lastScanSecondsAgo)}
        </div>
        <div className="pp-stat-label">Last scan</div>
      </div>

      <div className="pp-stat">
        <div className="pp-stat-num">
          {Number(system.verifiedDropsToday || 0)}
        </div>
        <div className="pp-stat-label">Verified drops today</div>
      </div>
    </section>
  );
};

export default Stats;
