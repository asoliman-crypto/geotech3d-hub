// Branded loading animation: a survey drone hovering over a small city while
// LiDAR beams scan downward. Shown briefly on view changes and during exports.
export function LidarLoader({ label = "Loading workspace" }) {
  return (
    <div className="lidar-overlay" role="status" aria-live="polite">
      <div className="lidar-stage">
        <svg viewBox="0 0 240 210" className="lidar-art" aria-hidden="true">
          <defs>
            <clipPath id="lidarConeClip">
              <polygon points="120,62 60,168 180,168" />
            </clipPath>
          </defs>

          {/* city skyline */}
          <g className="lidar-city">
            <rect x="40" y="150" width="22" height="36" rx="2" fill="#4a4744" />
            <rect x="64" y="134" width="18" height="52" rx="2" fill="#3c3a37" />
            <rect x="86" y="156" width="16" height="30" rx="2" fill="#524f4b" />
            <rect x="118" y="140" width="22" height="46" rx="2" fill="#3c3a37" />
            <rect x="144" y="154" width="16" height="32" rx="2" fill="#4a4744" />
            <rect x="166" y="144" width="20" height="42" rx="2" fill="#524f4b" />
            <rect x="190" y="158" width="16" height="28" rx="2" fill="#3c3a37" />
          </g>
          <rect x="22" y="186" width="196" height="2.4" rx="1.2" fill="#5f5e5a" />

          {/* scanning cone + sweep */}
          <polygon className="lidar-cone" points="120,62 60,168 180,168" fill="rgba(160,132,13,0.12)" />
          <g clipPath="url(#lidarConeClip)">
            <rect className="lidar-sweep" x="40" y="62" width="160" height="10" fill="rgba(201,169,58,0.55)" />
          </g>

          {/* LiDAR beams (points raining down) */}
          <g className="lidar-beams" stroke="#a0840d" strokeWidth="1.5" strokeLinecap="round">
            <line className="b b1" x1="120" y1="62" x2="62" y2="150" />
            <line className="b b2" x1="120" y1="62" x2="92" y2="156" />
            <line className="b b3" x1="120" y1="62" x2="124" y2="140" />
            <line className="b b4" x1="120" y1="62" x2="152" y2="154" />
            <line className="b b5" x1="120" y1="62" x2="184" y2="146" />
          </g>

          {/* scan hits */}
          <g fill="#c9a93a">
            <circle className="lidar-pt p1" cx="51" cy="150" r="2.6" />
            <circle className="lidar-pt p2" cx="73" cy="134" r="2.6" />
            <circle className="lidar-pt p3" cx="129" cy="140" r="2.6" />
            <circle className="lidar-pt p4" cx="176" cy="144" r="2.6" />
          </g>

          {/* drone */}
          <g className="lidar-drone">
            <rect x="78" y="49" width="24" height="3" rx="1.5" fill="#5f5e5a" />
            <rect x="138" y="49" width="24" height="3" rx="1.5" fill="#5f5e5a" />
            <ellipse className="rotor r1" cx="80" cy="47" rx="15" ry="2.6" fill="#9aa0a6" />
            <ellipse className="rotor r2" cx="160" cy="47" rx="15" ry="2.6" fill="#9aa0a6" />
            <rect x="98" y="44" width="44" height="15" rx="6.5" fill="#4a4744" />
            <rect x="106" y="47" width="28" height="4" rx="2" fill="#6b6862" />
            <rect x="112" y="57" width="16" height="8" rx="2.5" fill="#a0840d" />
          </g>
        </svg>

        <div className="lidar-label">
          {label}
          <span className="lidar-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
    </div>
  );
}
