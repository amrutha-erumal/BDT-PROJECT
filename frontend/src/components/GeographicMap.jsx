import React, { useMemo, useState } from 'react';
import { INDIA_STATES } from '../data/indiaStatesPaths';

const LON_MIN = 67.5;
const LON_MAX = 98.0;
const LAT_MIN = 6.5;
const LAT_MAX = 37.5;
const SVG_W = 640;
const SVG_H = 620;
const PAD_X = 40;
const PAD_Y = 25;

function project(lat, lon) {
  const x = PAD_X + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (SVG_W - PAD_X * 2);
  const y = PAD_Y + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (SVG_H - PAD_Y * 2);
  return [Number(x.toFixed(1)), Number(y.toFixed(1))];
}

const CITY_COORDS = {
  delhi: { lat: 28.61, lon: 77.21, align: 'right' },
  'new delhi': { lat: 28.61, lon: 77.21, align: 'right' },
  mumbai: { lat: 19.08, lon: 72.88, align: 'left' },
  bombay: { lat: 19.08, lon: 72.88, align: 'left' },
  pune: { lat: 18.52, lon: 73.86, align: 'top' },
  hyderabad: { lat: 17.39, lon: 78.49, align: 'right' },
  bangalore: { lat: 12.97, lon: 77.59, align: 'top' },
  bengaluru: { lat: 12.97, lon: 77.59, align: 'top' },
  mysore: { lat: 12.30, lon: 76.64, align: 'left' },
  mysuru: { lat: 12.30, lon: 76.64, align: 'left' },
  chennai: { lat: 13.08, lon: 80.27, align: 'right' },
  madras: { lat: 13.08, lon: 80.27, align: 'right' },
  kolkata: { lat: 22.57, lon: 88.36, align: 'right' },
  calcutta: { lat: 22.57, lon: 88.36, align: 'right' },
  ahmedabad: { lat: 23.02, lon: 72.57, align: 'left' },
  surat: { lat: 21.17, lon: 72.83, align: 'left' },
  jaipur: { lat: 26.91, lon: 75.79, align: 'left' },
  lucknow: { lat: 26.85, lon: 80.95, align: 'right' },
  kanpur: { lat: 26.45, lon: 80.33, align: 'left' },
  nagpur: { lat: 21.15, lon: 79.09, align: 'right' },
  indore: { lat: 22.72, lon: 75.86, align: 'left' },
  bhopal: { lat: 23.26, lon: 77.41, align: 'right' },
  patna: { lat: 25.59, lon: 85.14, align: 'right' },
  vadodara: { lat: 22.31, lon: 73.19, align: 'left' },
  kochi: { lat: 9.93, lon: 76.27, align: 'left' },
  cochin: { lat: 9.93, lon: 76.27, align: 'left' },
  thiruvananthapuram: { lat: 8.52, lon: 76.94, align: 'left' },
  trivandrum: { lat: 8.52, lon: 76.94, align: 'left' },
  visakhapatnam: { lat: 17.69, lon: 83.22, align: 'right' },
  vizag: { lat: 17.69, lon: 83.22, align: 'right' },
  bhubaneswar: { lat: 20.30, lon: 85.82, align: 'right' },
  chandigarh: { lat: 30.73, lon: 76.78, align: 'left' },
  guwahati: { lat: 26.14, lon: 91.74, align: 'right' },
  coimbatore: { lat: 11.02, lon: 76.96, align: 'left' },
  madurai: { lat: 9.93, lon: 78.12, align: 'right' },
  gurugram: { lat: 28.46, lon: 77.03, align: 'left' },
  gurgaon: { lat: 28.46, lon: 77.03, align: 'left' },
  noida: { lat: 28.54, lon: 77.39, align: 'right' },
  amritsar: { lat: 31.63, lon: 74.87, align: 'left' },
  ludhiana: { lat: 30.90, lon: 75.86, align: 'left' },
  agra: { lat: 27.18, lon: 78.01, align: 'right' },
  varanasi: { lat: 25.32, lon: 82.97, align: 'right' },
  ranchi: { lat: 23.34, lon: 85.31, align: 'right' },
  raipur: { lat: 21.25, lon: 81.63, align: 'right' },
  goa: { lat: 15.30, lon: 74.12, align: 'left' },
  panaji: { lat: 15.50, lon: 73.83, align: 'left' },
  mangalore: { lat: 12.91, lon: 74.86, align: 'left' },
  vijayawada: { lat: 16.51, lon: 80.65, align: 'right' },
  nashik: { lat: 19.99, lon: 73.79, align: 'left' },
  rajkot: { lat: 22.30, lon: 70.80, align: 'left' },
  jodhpur: { lat: 26.24, lon: 73.02, align: 'left' },
  udaipur: { lat: 24.59, lon: 73.71, align: 'left' },
  srinagar: { lat: 34.08, lon: 74.80, align: 'left' },
  jammu: { lat: 32.73, lon: 74.86, align: 'left' },
  leh: { lat: 34.15, lon: 77.58, align: 'right' },
  dehradun: { lat: 30.32, lon: 78.03, align: 'right' },
  shimla: { lat: 31.10, lon: 77.17, align: 'right' },
};

export default function GeographicMap({ locations, colors, money, onSelectLocation }) {
  const [hoveredCity, setHoveredCity] = useState(null);
  const [hoveredState, setHoveredState] = useState(null);

  const maxAmount = locations[0]?.amount || 1;

  const { mapped, unmapped } = useMemo(() => {
    const m = [];
    const u = [];
    locations.forEach((loc, idx) => {
      const key = String(loc.name || '').trim().toLowerCase();
      const coord = CITY_COORDS[key];
      const color = colors[idx % colors.length];
      if (coord) {
        const [x, y] = project(coord.lat, coord.lon);
        m.push({ ...loc, x, y, align: coord.align, color, rank: idx + 1 });
      } else {
        u.push({ ...loc, color, rank: idx + 1 });
      }
    });
    return { mapped: m, unmapped: u };
  }, [locations, colors]);

  const corridors = useMemo(() => {
    if (mapped.length < 2) return [];
    const hub = mapped[0];
    return mapped.slice(1).map((target) => {
      const mx = (hub.x + target.x) / 2;
      const my = Math.min(hub.y, target.y) - 26;
      return {
        key: `${hub.name}-${target.name}`,
        d: `M ${hub.x} ${hub.y} Q ${mx} ${my} ${target.x} ${target.y}`,
        color: target.color,
      };
    });
  }, [mapped]);

  return (
    <div className="geo-map">
      <div className="map-grid" />
      <div className="geo-map-stage">
        <svg
          className="geo-india-svg"
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Updated India map with 28 states and 8 union territories"
        >
          <defs>
            <radialGradient id="indiaStateFill" cx="46%" cy="48%" r="56%">
              <stop offset="0%" stopColor="#165a7e" stopOpacity="0.62" />
              <stop offset="65%" stopColor="#0c2f4a" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#071a2d" stopOpacity="0.86" />
            </radialGradient>
            <filter id="indiaGlow" x="-12%" y="-12%" width="124%" height="124%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Latitude / Longitude graticule lines */}
          {[10, 15, 20, 25, 30, 35].map((lat) => {
            const [, y] = project(lat, LON_MIN);
            return (
              <g key={`lat-${lat}`}>
                <line x1={PAD_X} y1={y} x2={SVG_W - PAD_X} y2={y} stroke="#48dff7" strokeOpacity="0.065" strokeDasharray="3 5" />
                <text x={8} y={y + 3} className="geo-graticule-label">{lat}°N</text>
              </g>
            );
          })}
          {[70, 75, 80, 85, 90, 95].map((lon) => {
            const [x] = project(LAT_MIN, lon);
            return (
              <g key={`lon-${lon}`}>
                <line x1={x} y1={PAD_Y} x2={x} y2={SVG_H - PAD_Y} stroke="#48dff7" strokeOpacity="0.065" strokeDasharray="3 5" />
                <text x={x} y={SVG_H - 6} textAnchor="middle" className="geo-graticule-label">{lon}°E</text>
              </g>
            );
          })}

          {/* Updated India States & Union Territories (36 regions: Ladakh, J&K, Telangana, etc.) */}
          <g>
            {INDIA_STATES.map((st) => {
              const isActive = hoveredState === st.name;
              return (
                <path
                  key={st.name}
                  d={st.d}
                  className={`geo-state-path ${isActive ? 'active' : ''}`}
                  fill={isActive ? '#1b6b94' : 'url(#indiaStateFill)'}
                  fillOpacity={isActive ? 0.85 : 1}
                  stroke="#50e4ff"
                  strokeWidth={isActive ? '1.35' : '0.75'}
                  strokeOpacity={isActive ? 0.95 : 0.42}
                  strokeLinejoin="round"
                  onMouseEnter={() => setHoveredState(st.name)}
                  onMouseLeave={() => setHoveredState(null)}
                >
                  <title>{st.name}</title>
                </path>
              );
            })}
          </g>

          {/* Corridor arcs from top location */}
          {corridors.map((arc) => (
            <path
              key={arc.key}
              d={arc.d}
              fill="none"
              stroke={arc.color}
              strokeOpacity="0.42"
              strokeWidth="1.3"
              strokeDasharray="5 5"
              className="flow-path"
              pointerEvents="none"
            />
          ))}

          {/* Pulsing geographic markers */}
          {mapped.map((city) => {
            const ratio = maxAmount ? city.amount / maxAmount : 0.5;
            const ringR = 8 + ratio * 10;
            const isHovered = hoveredCity === city.name;
            return (
              <g key={`dot-${city.name}`} className="geo-svg-marker" pointerEvents="none">
                <circle cx={city.x} cy={city.y} r={ringR} fill={city.color} fillOpacity={isHovered ? 0.28 : 0.14} />
                <circle cx={city.x} cy={city.y} r={isHovered ? 6 : 4.5} fill={city.color} stroke="#04121f" strokeWidth="1.5" />
              </g>
            );
          })}
        </svg>

        {/* Interactive HTML city pin callouts aligned 1:1 with SVG coordinates */}
        {mapped.map((city) => (
          <button
            key={city.name}
            type="button"
            className={`geo-pin geo-pin-${city.align} ${hoveredCity === city.name ? 'active' : ''}`}
            style={{
              left: `${(city.x / SVG_W) * 100}%`,
              top: `${(city.y / SVG_H) * 100}%`,
            }}
            onMouseEnter={() => setHoveredCity(city.name)}
            onMouseLeave={() => setHoveredCity(null)}
            onClick={() => onSelectLocation(city.name)}
            title={`${city.name}: ${money(city.amount)} (${city.count} records) — Click to inspect in Data Explorer`}
          >
            <i style={{ background: city.color }} />
            <span>
              {city.name}
              <b>{money(city.amount)}</b>
            </span>
          </button>
        ))}
      </div>

      <div className="geo-map-hud">
        <span>
          <b className="hud-dot" />
          {hoveredState ? hoveredState.toUpperCase() : 'INDIA · 28 STATES & 8 UTs'}
        </span>
        <small>{mapped.length} mapped {mapped.length === 1 ? 'city' : 'cities'} · Click a pin to filter records</small>
      </div>

      {unmapped.length > 0 && (
        <div className="geo-unmapped">
          <span>OTHER REGIONS:</span>
          {unmapped.map((loc) => (
            <button
              key={loc.name}
              type="button"
              className="geo-unmapped-pill"
              onClick={() => onSelectLocation(loc.name)}
            >
              <i style={{ background: loc.color }} />
              {loc.name} · <b>{money(loc.amount)}</b>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
