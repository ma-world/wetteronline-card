const CARD_VERSION = "1.0.1";

const WO_BASE = "https://api-web.wo-cloud.com";

const DAYS = ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."];

const DEFAULT_INTERVAL = 600;
// Floor on the poll interval: a typo like `update_interval: 1` would otherwise
// hammer a third-party API from every device showing the dashboard.
const MIN_INTERVAL = 60;

function pad(n) { return String(n).padStart(2, "0"); }

function svgSun(size) {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}">
    <g stroke="#FFC400" stroke-width="4" stroke-linecap="round">
      <line x1="32" y1="4" x2="32" y2="12"/><line x1="32" y1="52" x2="32" y2="60"/>
      <line x1="4" y1="32" x2="12" y2="32"/><line x1="52" y1="32" x2="60" y2="32"/>
      <line x1="12" y1="12" x2="18" y2="18"/><line x1="46" y1="46" x2="52" y2="52"/>
      <line x1="12" y1="52" x2="18" y2="46"/><line x1="46" y1="18" x2="52" y2="12"/>
    </g>
    <circle cx="32" cy="32" r="14" fill="#FFD400"/>
  </svg>`;
}

function svgMoon(size) {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}">
    <path d="M42 8a24 24 0 1 0 14 44A26 26 0 0 1 42 8z" fill="#E8EEF5"/>
  </svg>`;
}

const CLOUD_PATH = "M19 48h27a12 12 0 0 0 1.8-23.9A16 16 0 0 0 17.6 22 12.6 12.6 0 0 0 19 48z";

function svgCloud(size, grey) {
  const fill = grey ? "#C9D2DA" : "#FFFFFF";
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}">
    <path d="${CLOUD_PATH}" fill="${fill}"/>
  </svg>`;
}

// Sun (or moon) peeking behind a cloud; `cloudy` makes the cloud dominant.
function svgMixed(size, night, cloudy) {
  const orb = night
    ? `<path d="M46 6a15 15 0 1 0 9 27A16 16 0 0 1 46 6z" fill="#E8EEF5"/>`
    : `<g stroke="#FFC400" stroke-width="3.5" stroke-linecap="round">
         <line x1="43" y1="1" x2="43" y2="7"/><line x1="60" y1="18" x2="66" y2="18"/>
         <line x1="55" y1="6" x2="59" y2="2"/><line x1="55" y1="30" x2="59" y2="34"/>
         <line x1="31" y1="18" x2="25" y2="18"/><line x1="31" y1="6" x2="27" y2="2"/>
       </g>
       <circle cx="43" cy="18" r="11" fill="#FFD400"/>`;
  const cloudFill = cloudy ? "#DDE4EA" : "#FFFFFF";
  const scale = cloudy ? 1 : 0.82;
  const dy = cloudy ? 0 : 8;
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}">
    ${orb}
    <g transform="translate(0 ${dy}) scale(${scale})">
      <path d="${CLOUD_PATH}" fill="${cloudFill}"/>
    </g>
  </svg>`;
}

function svgRain(size, drops, night, sunny) {
  const orb = sunny
    ? (night
        ? `<path d="M46 4a14 14 0 1 0 8 25A15 15 0 0 1 46 4z" fill="#E8EEF5"/>`
        : `<circle cx="45" cy="15" r="10" fill="#FFD400"/>`)
    : "";
  let d = "";
  const xs = drops >= 3 ? [22, 32, 42] : drops === 2 ? [26, 38] : [32];
  xs.forEach((x) => {
    d += `<line x1="${x}" y1="50" x2="${x - 3}" y2="60" stroke="#5FA8DC" stroke-width="4" stroke-linecap="round"/>`;
  });
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}">
    ${orb}
    <g transform="translate(0 -4) scale(0.95)"><path d="${CLOUD_PATH}" fill="#C9D2DA"/></g>
    ${d}
  </svg>`;
}

function svgSnow(size) {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}">
    <g transform="translate(0 -4) scale(0.95)"><path d="${CLOUD_PATH}" fill="#C9D2DA"/></g>
    <g fill="#FFFFFF"><circle cx="24" cy="55" r="3"/><circle cx="34" cy="58" r="3"/><circle cx="44" cy="55" r="3"/></g>
  </svg>`;
}

function svgStorm(size) {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}">
    <g transform="translate(0 -4) scale(0.95)"><path d="${CLOUD_PATH}" fill="#AEB9C4"/></g>
    <path d="M34 46l-9 12h7l-3 10 12-14h-7l4-8z" fill="#FFD400"/>
  </svg>`;
}

/*
 * WetterOnline symbol codes are six characters. The first two encode cloud
 * cover (so = clear, wb = sun dominant, bw = cloud dominant, bd = overcast);
 * the remainder encodes precipitation, which is left as underscores when dry.
 */
function iconFor(symbol, night, precipProb, precipType) {
  const sym = (symbol || "").toLowerCase();
  const sky = sym.slice(0, 2);
  const rest = sym.slice(2).replace(/_/g, "");
  const wet = rest.length > 0;

  if (sym.includes("g") && wet) return svgStorm;
  if (precipType === "snow" && wet) return svgSnow;

  if (wet) {
    const drops = precipProb >= 0.6 ? 3 : precipProb >= 0.3 ? 2 : 1;
    const sunny = sky === "so" || sky === "wb";
    return (s) => svgRain(s, drops, night, sunny);
  }

  if (sky === "so") return night ? svgMoon : svgSun;
  if (sky === "wb") return (s) => svgMixed(s, night, false);
  if (sky === "bw") return (s) => svgMixed(s, night, true);
  if (sky === "bd") return (s) => svgCloud(s, true);
  return (s) => svgMixed(s, night, true);
}

/*
 * Background evokes a real sky rather than a flat fill: several soft light
 * blobs of differing size and opacity are layered over a vertical gradient,
 * which reads as depth in cloud cover the way a photograph would.
 */
function skyStyle(symbol, night) {
  const sky = (symbol || "").slice(0, 2).toLowerCase();
  const blobs = (a, b, c, d) => `
    radial-gradient(58% 42% at 16% 6%,  rgba(255,255,255,${a}), transparent 62%),
    radial-gradient(46% 34% at 78% 14%, rgba(255,255,255,${b}), transparent 64%),
    radial-gradient(70% 40% at 46% 30%, rgba(255,255,255,${c}), transparent 66%),
    radial-gradient(90% 50% at 62% 88%, rgba(255,255,255,${d}), transparent 60%),
    radial-gradient(40% 26% at 8% 46%,  rgba(255,255,255,${d}), transparent 62%)`;

  if (night) {
    return `background:${blobs(0.10, 0.07, 0.06, 0.05)},
      linear-gradient(168deg,#16233c 0%,#22344d 42%,#33475f 100%);`;
  }
  if (sky === "so") {
    return `background:${blobs(0.40, 0.26, 0.16, 0.14)},
      linear-gradient(168deg,#2f7cb8 0%,#4f9acd 40%,#89bfe4 100%);`;
  }
  if (sky === "bd") {
    return `background:${blobs(0.46, 0.38, 0.30, 0.24)},
      linear-gradient(168deg,#78889a 0%,#8c9aab 48%,#a7b3be 100%);`;
  }
  // partly cloudy — the look from the reference screenshot
  return `background:${blobs(0.52, 0.40, 0.26, 0.20)},
    linear-gradient(168deg,#637c95 0%,#7d94ab 44%,#a0b3c3 100%);`;
}

// The API wraps live values in pseudo-tags, e.g. <WOCurrentTemperature>22</...>.
function stripTags(s) {
  return (s || "").replace(/<\/?WO[A-Za-z]*>/g, "");
}

class WetterOnlineCard extends HTMLElement {
  setConfig(config) {
    if (!config.api_key) {
      throw new Error(
        "wetteronline-card: 'api_key' is required — see the README for how to obtain it"
      );
    }
    if (!config.location_id) {
      throw new Error("wetteronline-card: 'location_id' is required (e.g. a6571)");
    }
    this.config = {
      hours: 7,
      name: "",
      region: "",
      show_sun: true,
      show_text: true,
      update_interval: DEFAULT_INTERVAL,
      ...config,
    };
    this._data = null;
    this._error = null;
    // The card editor calls setConfig repeatedly on the same element for its
    // live preview, so the shadow root must only ever be attached once.
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
  }

  get _intervalMs() {
    const secs = Number(this.config.update_interval);
    return Math.max(MIN_INTERVAL, secs > 0 ? secs : DEFAULT_INTERVAL) * 1000;
  }

  connectedCallback() {
    this._load();
    this._timer = setInterval(() => this._load(), this._intervalMs);
    this._clock = setInterval(() => this._render(), 30 * 1000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
    clearInterval(this._clock);
  }

  set hass(_hass) { /* data comes straight from the API; hass is unused */ }

  async _load() {
    const c = this.config;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin";
    const q = (o) =>
      Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

    const shortcast = `${WO_BASE}/blending/shortcast/v1?c=${encodeURIComponent(c.api_key)}&${q({
      language: "de",
      timezone: tz,
      location_id: c.location_id,
      latitude: c.latitude,
      longitude: c.longitude,
      astro_latitude: c.grid_latitude ?? c.latitude,
      astro_longitude: c.grid_longitude ?? c.longitude,
      altitude: c.altitude ?? 100,
      grid_latitude: c.grid_latitude ?? c.latitude,
      grid_longitude: c.grid_longitude ?? c.longitude,
    })}`;

    const astro = `${WO_BASE}/astro/days/v1?c=${encodeURIComponent(c.api_key)}&${q({
      latitude: c.grid_latitude ?? c.latitude,
      longitude: c.grid_longitude ?? c.longitude,
      timezone: tz,
    })}`;

    const texts = `${WO_BASE}/blending/texts/v1/one_day?c=${encodeURIComponent(c.api_key)}&${q({
      language: "de-DE",
      location_id: c.location_id,
      temperature_unit: "celsius",
      timezone: tz,
      windunit: "kmh",
      grid_latitude: c.grid_latitude ?? c.latitude,
      grid_longitude: c.grid_longitude ?? c.longitude,
    })}`;

    const get = (url) => fetch(url).then((r) => r.json());
    try {
      const [sc, as, tx] = await Promise.all([
        get(shortcast),
        c.show_sun ? get(astro) : Promise.resolve(null),
        c.show_text ? get(texts).catch(() => null) : Promise.resolve(null),
      ]);
      this._data = { sc, as, tx };
      this._error = null;
    } catch (e) {
      this._error = String(e);
    }
    this._render();
  }

  _render() {
    if (!this.shadowRoot) return;

    if (this._error) {
      this.shadowRoot.innerHTML =
        `<ha-card><div style="padding:16px">WetterOnline nicht erreichbar: ${this._error}</div></ha-card>`;
      return;
    }
    if (!this._data) {
      this.shadowRoot.innerHTML = `<ha-card><div style="padding:16px">Lade Wetterdaten ...</div></ha-card>`;
      return;
    }

    const c = this.config;
    const cur = this._data.sc.current || {};
    const hours = (this._data.sc.hours || []).slice(0, c.hours);

    const now = new Date();
    const stamp = `${DAYS[now.getDay()]} ${pad(now.getDate())}.${pad(now.getMonth() + 1)}. ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // sun times for today, used both for display and for day/night icons
    let rise = null, set = null;
    const today = this._data.as?.days?.find((d) => new Date(d.date).getDate() === now.getDate());
    if (today?.sun) {
      rise = today.sun.rise ? new Date(today.sun.rise) : null;
      set = today.sun.set ? new Date(today.sun.set) : null;
    }
    const isNight = (d) => (rise && set ? d < rise || d > set : false);
    const hm = (d) => (d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "--:--");

    const curNight = isNight(now);
    const curTemp = cur.air_temperature?.celsius;

    const cells = hours.map((h) => {
      const d = new Date(h.date);
      const prob = h.precipitation?.probability ?? 0;
      const icon = iconFor(h.symbol, isNight(d), prob, h.precipitation?.type)(42);
      return `<div class="cell">
        <div class="time">${pad(d.getHours())}:00</div>
        <div class="htemp">${h.air_temperature?.celsius ?? "-"}°</div>
        <div class="icon">${icon}</div>
        <div class="rain">
          <svg viewBox="0 0 24 24" width="11" height="11" style="vertical-align:-1px">
            <path d="M12 2.5S5.5 10.2 5.5 14.4a6.5 6.5 0 0 0 13 0C18.5 10.2 12 2.5 12 2.5z"
                  fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
          ${Math.round(prob * 100)}&nbsp;%
        </div>
      </div>`;
    }).join("");

    const sunRow = c.show_sun && (rise || set)
      ? `<div class="sun">
           ${svgSun(15)}
           <span class="up">&#8593; ${hm(rise)}</span>
           <span class="down">&#8595; ${hm(set)}</span>
         </div>`
      : "";

    const wind = cur.wind?.speed?.kilometer_per_hour?.value;

    const todayText = Array.isArray(this._data.tx)
      ? this._data.tx.find((t) => new Date(t.date).getDate() === now.getDate())
      : null;
    const banner = todayText?.text
      ? `<div class="banner">
           <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round">
             <path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 13h15a3 3 0 1 1-3 3"/><path d="M3 18h8"/>
           </svg>
           <span>${stripTags(todayText.text)}</span>
         </div>`
      : "";

    this.shadowRoot.innerHTML = `
      <style>
        ha-card{
          overflow:hidden;
          border:none;
          ${skyStyle(cur.symbol, curNight)}
          color:#fff;
          text-shadow:0 1px 3px rgba(0,0,0,.35);
        }
        .wrap{padding:18px 20px 16px}
        .top{display:flex;justify-content:space-between;align-items:baseline;
             font-size:13px;opacity:.92;letter-spacing:.2px;gap:10px}
        .title{font-size:29px;font-weight:300;margin:5px 0 12px;line-height:1.1;
               letter-spacing:-.3px}
        .pill{display:inline-block;background:rgba(255,255,255,.22);
              border-radius:6px;padding:4px 13px;font-size:13px;
              backdrop-filter:blur(2px)}
        .mid{display:flex;justify-content:space-between;align-items:flex-end;
             margin-top:2px;gap:12px;flex-wrap:wrap}
        .temp{font-size:74px;font-weight:200;line-height:1;letter-spacing:-3px}
        .meta{display:flex;flex-direction:column;align-items:flex-end;gap:7px;
              font-size:13px;opacity:.95;padding-bottom:10px}
        .sun{display:flex;align-items:center;gap:9px;white-space:nowrap}
        .sun svg{vertical-align:middle}
        .wind{opacity:.88}
        hr{border:none;border-top:1px solid rgba(255,255,255,.30);margin:16px 0 13px}
        .grid{display:grid;grid-template-columns:repeat(${hours.length},1fr);
              gap:2px;text-align:center}
        .cell{display:flex;flex-direction:column;align-items:center;gap:7px}
        .time{font-size:12.5px;font-weight:600;opacity:.95}
        .htemp{font-size:21px;font-weight:300}
        .icon{line-height:0}
        .rain{font-size:11px;opacity:.9;white-space:nowrap}
        .banner{display:flex;align-items:center;gap:10px;margin-top:15px;
                background:rgba(12,42,68,.42);border-radius:9px;
                padding:11px 13px;font-size:13px;line-height:1.35;
                backdrop-filter:blur(3px)}
        .banner svg{flex:0 0 auto;opacity:.95}
        @media (max-width:430px){
          .temp{font-size:56px;letter-spacing:-2px}
          .title{font-size:23px}
          .htemp{font-size:17px}
          .wrap{padding:15px 15px 13px}
        }
      </style>
      <ha-card>
        <div class="wrap">
          <div class="top"><span>${c.region || ""}</span><span>${stamp}</span></div>
          <div class="title">${c.name ? "Wetter " + c.name : "Wetter"}</div>
          <span class="pill">aktuell</span>
          <div class="mid">
            <div class="temp">${curTemp ?? "-"}°</div>
            <div class="meta">
              ${wind != null ? `<div class="wind">Wind ${wind} km/h</div>` : ""}
              ${sunRow}
            </div>
          </div>
          <hr>
          <div class="grid">${cells}</div>
          ${banner}
        </div>
      </ha-card>`;
  }

  getCardSize() { return 5; }

  static getStubConfig() {
    return {
      api_key: "",
      location_id: "a6571",
      latitude: 50.08125,
      longitude: 8.51625,
      grid_latitude: "50.10",
      grid_longitude: "8.48",
      name: "Sindlingen",
      region: "Frankfurt am Main · Hessen",
      hours: 7,
      update_interval: 600,
    };
  }
}

customElements.define("wetteronline-card", WetterOnlineCard);

console.info(
  `%c WETTERONLINE-CARD %c v${CARD_VERSION} `,
  "color:#fff;background:#5b7fa3;font-weight:700;border-radius:3px 0 0 3px",
  "color:#5b7fa3;background:#e8eef5;font-weight:700;border-radius:0 3px 3px 0"
);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "wetteronline-card",
  name: "WetterOnline",
  description: "Aktuelles Wetter und Stundenvorhersage von WetterOnline",
});
