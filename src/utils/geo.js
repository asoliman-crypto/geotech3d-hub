// Project geolocation for the Map View.
// Accuracy: a project's explicit `location { city, region, lat, lng }` wins;
// otherwise the name/client text is matched against a city table. Pin x/y are
// derived from real lat/lng via an equirectangular projection over a regional
// bounding box, so positions are geographically meaningful (not hand-placed).

const CITY_TABLE = [
  { match: ["new administrative capital", "new capital", "nac"], region: "Egypt", city: "New Administrative Capital", lat: 30.02, lng: 31.8 },
  { match: ["cairo", "egypt"], region: "Egypt", city: "Cairo", lat: 30.0444, lng: 31.2357 },
  { match: ["alexandria"], region: "Egypt", city: "Alexandria", lat: 31.2001, lng: 29.9187 },
  { match: ["riyadh"], region: "Saudi Arabia", city: "Riyadh", lat: 24.7136, lng: 46.6753 },
  { match: ["jeddah"], region: "Saudi Arabia", city: "Jeddah", lat: 21.4858, lng: 39.1925 },
  { match: ["neom", "saudi", "ksa"], region: "Saudi Arabia", city: "Saudi Arabia", lat: 24.7136, lng: 46.6753 },
  { match: ["dubai", "marina"], region: "UAE", city: "Dubai", lat: 25.2048, lng: 55.2708 },
  { match: ["abu dhabi"], region: "UAE", city: "Abu Dhabi", lat: 24.4539, lng: 54.3773 },
  { match: ["sharjah"], region: "UAE", city: "Sharjah", lat: 25.3463, lng: 55.4209 },
  { match: ["uae", "emirates"], region: "UAE", city: "United Arab Emirates", lat: 24.4539, lng: 54.3773 },
  { match: ["doha", "qatar"], region: "Qatar", city: "Doha", lat: 25.2854, lng: 51.531 },
  { match: ["kuwait"], region: "Kuwait", city: "Kuwait City", lat: 29.3759, lng: 47.9774 },
  { match: ["muscat", "oman"], region: "Oman", city: "Muscat", lat: 23.588, lng: 58.3829 },
  { match: ["manama", "bahrain"], region: "Bahrain", city: "Manama", lat: 26.2285, lng: 50.586 },
  { match: ["amman", "jordan"], region: "Jordan", city: "Amman", lat: 31.9454, lng: 35.9284 },
];

const BOUNDS = { lngMin: 26, lngMax: 58, latMin: 12, latMax: 33 };
const VIEW = { xMin: 8, xMax: 94, yMin: 8, yMax: 64 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round1 = (value) => Math.round(value * 10) / 10;

export function projectMapPoint(lat, lng) {
  const x = VIEW.xMin + ((lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * (VIEW.xMax - VIEW.xMin);
  const y = VIEW.yMin + ((BOUNDS.latMax - lat) / (BOUNDS.latMax - BOUNDS.latMin)) * (VIEW.yMax - VIEW.yMin);
  return { x: round1(clamp(x, 4, 96)), y: round1(clamp(y, 4, 66)) };
}

function formatCoordinates(lat, lng) {
  const latPart = `${Math.abs(lat).toFixed(4)}${lat >= 0 ? "N" : "S"}`;
  const lngPart = `${Math.abs(lng).toFixed(4)}${lng >= 0 ? "E" : "W"}`;
  return `${latPart} / ${lngPart}`;
}

function locatedGeo({ region, city, lat, lng }) {
  return {
    region,
    city,
    lat,
    lng,
    coordinates: formatCoordinates(lat, lng),
    located: true,
    ...projectMapPoint(lat, lng),
  };
}

export function inferProjectGeo(project) {
  const loc = project?.location;

  // 1) explicit coordinates on the project win
  if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
    return locatedGeo({
      region: loc.region || "Custom Site",
      city: loc.city || "Project Site",
      lat: loc.lat,
      lng: loc.lng,
    });
  }

  // 2) match name / client / location text against the city table
  const text = `${project?.name || ""} ${project?.client || ""} ${loc?.city || ""} ${loc?.region || ""}`.toLowerCase();
  const hit = CITY_TABLE.find((entry) => entry.match.some((term) => text.includes(term)));
  if (hit) {
    return locatedGeo(hit);
  }

  // 3) unknown location
  return {
    region: "Unmapped",
    city: "Location pending",
    lat: null,
    lng: null,
    coordinates: "Geo location pending",
    located: false,
    x: 50,
    y: 50,
  };
}
