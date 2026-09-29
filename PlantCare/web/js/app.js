// PlantCare frontend. The diagnosis itself is done by the Java backend - JS only sends and shows data.
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initials = (n) => n.replace(/^Dr\.\s*/, "").split(" ").map((w) => w[0]).slice(0, 2).join("");

// Ask the Java server for data (GET request -> JSON)
async function api(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Server error");
  return data;
}

// Highlight the current page in the navigation
const page = document.body.dataset.page;
document.querySelectorAll(".nav nav a").forEach((a) => a.classList.toggle("on", a.dataset.p === page));

// ---------- Diagnose page ----------
const form = $("#diagnose-form");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#error");
    err.textContent = "";
    const plant = $("#plant").value;
    const symptoms = [...document.querySelectorAll("input[name=symptom]:checked")].map((c) => c.value);

    // basic validation
    if (!plant) { err.textContent = "Please select a plant."; return; }
    if (symptoms.length === 0) { err.textContent = "Please select at least one symptom."; return; }

    try {
      const url = `/api/diagnose?plant=${encodeURIComponent(plant)}&symptoms=${encodeURIComponent(symptoms.join(","))}`;
      showResult(await api(url));
    } catch (x) {
      err.textContent = "Could not get a result. Is the Java server running? (" + x.message + ")";
    }
  });
}

function showResult(r) {
  const width = { HIGH: 100, MEDIUM: 66, LOW: 33 }[r.confidence] || 33;
  const expertBtn = r.key
    ? `<a class="btn" href="experts.html?deficiency=${encodeURIComponent(r.key)}">Find an Expert</a>`
    : `<a class="btn" href="experts.html">Find an Expert</a>`;
  const warn = r.preliminary
    ? `<div class="warn">⚠️ This result is preliminary. Please consult an agricultural expert.</div>` : "";
  const cure = CURE[r.key] || { label: "?", color: "#64748b", say: "I'm not sure what is wrong with me... please ask an expert!" };
  $("#result").innerHTML = `
    <section class="card result">
      <div class="stage k-${esc(r.key || "none")}">
        <div class="stage-top">
          <small><span>ANALYSIS COMPLETE</span> · ${PLANT_ICON[r.plant] || "🌱"} ${esc(r.plant)}</small>
          <h2>${esc(r.deficiency)}</h2>
          <span class="chip ${esc(r.confidence)}">${esc(r.confidence)}</span>
        </div>
        <div class="bubble">${esc(cure.say)}</div>
        ${plantScene(r, cure)}
      </div>
      <div class="r-body">
        <div class="cure"><h4>💊 Recommended Action</h4><p>${esc(r.treatment)}</p></div>
        <h4>Confidence</h4>
        <div class="conf">${esc(r.confidence)} <small>(score ${r.score})</small></div>
        <div class="bar"><i class="${esc(r.confidence)}" style="width:0" data-w="${width}%"></i></div>
        <h4>Matched Symptoms</h4>
        <ul class="ticks">${r.matched.map((m) => `<li>${esc(m)}</li>`).join("") || "<li>None</li>"}</ul>
        <h4>Prevention</h4><p>${esc(r.prevention)}</p>
        <h4>Why this result?</h4><p>${esc(r.explanation)}</p>
        ${warn}
        <div class="actions">${expertBtn}<button class="btn ghost" id="again" type="button">New Diagnosis</button></div>
      </div>
    </section>`;
  form.hidden = true;
  requestAnimationFrame(() => { const b = document.querySelector(".bar i"); if (b) b.style.width = b.dataset.w; });
  $("#again").addEventListener("click", () => {
    form.reset(); form.hidden = false; $("#result").innerHTML = ""; window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("#result").scrollIntoView({ behavior: "smooth" });
  loadHistory();
}

// ---------- Experts page ----------
const list = $("#experts");
if (list) {
  const key = new URLSearchParams(location.search).get("deficiency") || "";
  if (key) {
    $("#expert-sub").innerHTML = `<div class="banner">Showing experts for <b>${esc(key)} deficiency</b>. <a href="experts.html">Show all experts</a></div>`;
  }
  api("/api/experts?deficiency=" + encodeURIComponent(key))
    .then((experts) => {
      list.innerHTML = experts.map((x) => `
        <article class="card">
          <div class="ex-top"><div class="avatar">${esc(initials(x.name))}</div>
            <div><h3>${esc(x.name)}</h3><small>${esc(x.specialization)}</small></div></div>
          <p class="meta">🏅 ${x.years} years experience<br>📍 ${esc(x.location)}</p>
          <button class="btn" data-id="${x.id}" style="margin-top:14px">View Profile</button>
        </article>`).join("") || "<p>No experts found.</p>";
    })
    .catch(() => { list.innerHTML = "<p class='error'>Could not load experts. Is the Java server running?</p>"; });

  list.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    try { openProfile(await api("/api/expert?id=" + btn.dataset.id)); } catch (x) { alert(x.message); }
  });
}

function openProfile(x) {
  $("#modal-box").innerHTML = `
    <div class="bubble" style="margin:0 auto 12px;font-size:.9rem">Hi, I'm ${esc(x.name.replace(/^Dr\.\s*/, "").split(" ")[0])}! Ask me about ${esc(x.deficiencies.join(", "))}.</div>
    <div class="pavatar">${expertAvatar(x)}</div>
    <h2 style="margin:10px 0 0;text-align:center">${esc(x.name)}</h2>
    <p class="meta" style="text-align:center">${esc(x.specialization)}</p>
    <p style="margin:14px 0">${esc(x.description)}</p>
    <p class="meta">🏅 ${x.years} years experience<br>📍 ${esc(x.location)}</p>
    <h4 style="margin-top:14px;font-size:.8rem;letter-spacing:1px;color:#5b6f63">RELEVANT DEFICIENCIES</h4>
    ${x.deficiencies.map((d) => `<span class="tag">${esc(d)}</span>`).join("")}
    <div style="margin-top:22px"><button class="btn ghost" id="close" type="button">Close</button></div>`;
  $("#modal").hidden = false;
  $("#close").addEventListener("click", closeModal);
}
function closeModal() { $("#modal").hidden = true; }
if ($("#modal")) {
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
}

// ---------- Plant icons ----------
const PLANT_ICON = { Tomato: "🍅", Rice: "🌾", Potato: "🥔", Chilli: "🌶️", Banana: "🍌", Maize: "🌽", Brinjal: "🍆", Okra: "🌿", Coconut: "🥥" };

// ---------- Diagnosis history (read from Java's history.txt) ----------
async function loadHistory() {
  const box = $("#history");
  if (!box) return;
  try {
    const h = await api("/api/history");
    box.innerHTML = h.map((x) => `<li><b>${esc(x.plant)}</b> – ${esc(x.deficiency)} <span class="tag">${esc(x.confidence)}</span> <small>${esc(x.time)}</small></li>`).join("") || "<li>No diagnoses yet.</li>";
  } catch (e) { /* history is optional */ }
}
loadHistory();

// ---------- English / Malayalam toggle (UI labels only) ----------
const ML = {
  "Home": "ഹോം", "Diagnose": "രോഗനിർണയം", "Experts": "വിദഗ്ധർ",
  "Healthier Plants.": "ആരോഗ്യമുള്ള ചെടികൾ.", "Smarter Decisions.": "മികച്ച തീരുമാനങ്ങൾ.",
  "Identify possible nutrient deficiencies from visible plant symptoms and get practical guidance.": "ചെടിയിൽ കാണുന്ന ലക്ഷണങ്ങളിൽ നിന്ന് സാധ്യമായ പോഷകക്കുറവുകൾ തിരിച്ചറിഞ്ഞ് പ്രായോഗിക മാർഗനിർദേശം നേടുക.",
  "Start Diagnosis →": "രോഗനിർണയം തുടങ്ങുക →", "Meet Experts": "വിദഗ്ധരെ കാണുക",
  "How it works": "ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു", "Nutrients we check": "ഞങ്ങൾ പരിശോധിക്കുന്ന പോഷകങ്ങൾ",
  "Plant Diagnosis": "ചെടി രോഗനിർണയം", "Select plant": "ചെടി തിരഞ്ഞെടുക്കുക", "Choose a plant…": "ചെടി തിരഞ്ഞെടുക്കൂ…",
  "Select symptoms": "ലക്ഷണങ്ങൾ തിരഞ്ഞെടുക്കുക", "(choose all that apply)": "(ബാധകമായവ എല്ലാം)",
  "Yellow leaves": "മഞ്ഞ ഇലകൾ", "Slow growth": "വളർച്ച കുറവ്", "Brown leaf edges": "ഇലയുടെ അരികുകൾ തവിട്ടുനിറം",
  "Leaf curling": "ഇല ചുരുളൽ", "Pale/new leaves": "വിളറിയ പുതിയ ഇലകൾ", "Yellowing between veins": "ഞരമ്പുകൾക്കിടയിൽ മഞ്ഞളിപ്പ്",
  "Weak stems": "ബലമില്ലാത്ത തണ്ട്", "Early leaf drop": "ഇലകൾ നേരത്തെ കൊഴിയൽ",
  "Analyze Plant": "ചെടി വിശകലനം ചെയ്യുക", "Recent Diagnoses": "സമീപകാല പരിശോധനകൾ", "No diagnoses yet.": "ഇതുവരെ പരിശോധനകൾ ഇല്ല.",
  "ANALYSIS COMPLETE": "വിശകലനം പൂർത്തിയായി", "POSSIBLE DEFICIENCY": "സാധ്യമായ പോഷകക്കുറവ്",
  "Nitrogen Deficiency": "നൈട്രജൻ കുറവ്", "Potassium Deficiency": "പൊട്ടാസ്യം കുറവ്", "Iron Deficiency": "ഇരുമ്പ് കുറവ്", "Magnesium Deficiency": "മഗ്നീഷ്യം കുറവ്",
  "Confidence": "വിശ്വാസ്യത", "HIGH": "ഉയർന്നത്", "MEDIUM": "ഇടത്തരം", "LOW": "കുറവ്",
  "Matched Symptoms": "പൊരുത്തപ്പെട്ട ലക്ഷണങ്ങൾ", "Recommended Action": "ശുപാർശ ചെയ്യുന്ന നടപടി", "Prevention": "പ്രതിരോധം",
  "Why this result?": "എന്തുകൊണ്ട് ഈ ഫലം?", "Find an Expert": "വിദഗ്ധനെ കണ്ടെത്തുക", "New Diagnosis": "പുതിയ പരിശോധന",
  "Expert Connect": "വിദഗ്ധരുമായി ബന്ധപ്പെടുക", "View Profile": "പ്രൊഫൈൽ കാണുക", "Close": "അടയ്ക്കുക",
  "RELEVANT DEFICIENCIES": "ബന്ധപ്പെട്ട പോഷകക്കുറവുകൾ",
  "PlantCare provides preliminary symptom-based guidance and is not a substitute for professional agricultural diagnosis.": "PlantCare പ്രാഥമിക ലക്ഷണാധിഷ്ഠിത മാർഗനിർദേശം മാത്രമാണ് നൽകുന്നത്; ഇത് പ്രൊഫഷണൽ കാർഷിക രോഗനിർണയത്തിന് പകരമല്ല."
};
let lang = "en";
try { lang = localStorage.getItem("lang") || "en"; } catch (e) { /* storage blocked */ }

// Walk all text on the page; swap English text for Malayalam (and back) using the ML dictionary.
function applyLang() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    if (n.parentNode.closest("script,style,button.langbtn")) continue;
    if (n._en === undefined) {
      const core = n.nodeValue.replace(/^[^A-Za-z(]+/, "").trim();
      if (!ML[core]) continue;
      n._en = n.nodeValue; n._core = core;
    }
    n.nodeValue = lang === "ml" ? n._en.replace(n._core, ML[n._core]) : n._en;
  }
}
const langBtn = document.createElement("button");
langBtn.className = "langbtn"; langBtn.type = "button";
langBtn.textContent = lang === "ml" ? "English" : "മലയാളം";
langBtn.addEventListener("click", () => {
  lang = lang === "ml" ? "en" : "ml";
  try { localStorage.setItem("lang", lang); } catch (e) { /* ignore */ }
  langBtn.textContent = lang === "ml" ? "English" : "മലയാളം";
  applyLang();
});
$(".nav nav").appendChild(langBtn);

// ---------- Scroll-reveal animation ----------
const io = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
}), { threshold: 0.1 });
function watchReveal() {
  document.querySelectorAll(".card:not(.result):not(.form), .section h2").forEach((el) => {
    if (!el.dataset.rv) { el.dataset.rv = 1; el.classList.add("reveal"); io.observe(el); }
  });
}
// Re-run for content added later (results, expert cards, history)
new MutationObserver(() => { applyLang(); watchReveal(); }).observe(document.body, { childList: true, subtree: true });
applyLang();
watchReveal();


// ---------- Plant characters: a different pose, face and props for each deficiency ----------
const CURE = {
  Nitrogen:  { label: "N",  color: "#3b82f6", say: "I'm so tired and yellow... I need nitrogen!" },
  Potassium: { label: "K",  color: "#f59e0b", say: "My leaf edges are burning! Potassium, please!" },
  Iron:      { label: "Fe", color: "#8b5cf6", say: "My new leaves are pale and I feel dizzy... iron, please!" },
  Magnesium: { label: "Mg", color: "#10b981", say: "I'm yellow between my veins! I need magnesium!" }
};

function plantScene(r, cure) {
  const k = r.key, dark = "#3b1f0d";
  // leaf colours: a = light, b = dark (gradient), e = edge, v = veins
  const C = {
    Nitrogen:  { a: "#f3ea7a", b: "#d9c93a", e: "#b8a42a", w: 1.5, v: "#b8a42a" },   // yellow
    Potassium: { a: "#7ad584", b: "#3fae4d", e: "#8a5a2b", w: 5,   v: "#2f8f3a" },   // burnt brown edges
    Iron:      { a: "#6fce78", b: "#3fae4d", e: "#2e8b3a", w: 1.5, v: "#2e8b3a" },   // old leaves fine
    Magnesium: { a: "#ecec7a", b: "#cfcf3a", e: "#b5b52e", w: 1.5, v: "#2f9e44" }    // yellow, green veins
  }[k] || { a: "#86efac", b: "#22c55e", e: "#15803d", w: 1.5, v: "#15803d" };
  const P = { a: "#fbfde9", b: "#e3efc0", e: "#d3e3a8", w: 1.5, v: "#cfe0a6" };      // pale new leaves (Iron)
  const grad = (id, c) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.a}"/><stop offset="1" stop-color="${c.b}"/></linearGradient>`;

  // one smooth leaf starting at (bx,by), pointing at angle ang, length len, width wid
  const leaf = (bx, by, ang, len, wid, c, g, kind) => {
    let x = `<line x1="4" y1="0" x2="${len * 0.9}" y2="0" stroke="${c.v}" stroke-width="2" stroke-linecap="round" opacity=".7"/>`;
    if (kind === "veins") for (const t of [0.25, 0.42, 0.59, 0.76]) {
      x += `<path d="M${len * t} 0 l${len * 0.12} ${-wid * 0.55} M${len * t} 0 l${len * 0.12} ${wid * 0.55}" stroke="${c.v}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
    }
    if (kind === "spots") x += `<circle cx="${len * 0.78}" cy="${-wid * 0.25}" r="3.5" fill="#8a5a2b"/><circle cx="${len * 0.86}" cy="${wid * 0.2}" r="3" fill="#8a5a2b"/>`;
    const side = (ang > 90 || ang < -90) ? "lfL" : "lfR";
    return `<g class="${side}"><g transform="translate(${bx} ${by}) rotate(${ang})"><path d="M0 0 C${len * 0.25} ${-wid} ${len * 0.7} ${-wid} ${len} 0 C${len * 0.7} ${wid} ${len * 0.25} ${wid} 0 0Z" fill="url(#${g})" stroke="${c.e}" stroke-width="${c.w}" stroke-linejoin="round"/>${x}</g></g>`;
  };
  const kind = k === "Magnesium" ? "veins" : k === "Potassium" ? "spots" : "";
  const up = k === "Iron" ? [P, "lgp"] : [C, "lg"];
  const leaves =
    leaf(150, 150, 145, 62, 21, C, "lg", kind) + leaf(150, 150, 35, 62, 21, C, "lg", kind) +
    leaf(150, 118, 158, 78, 26, up[0], up[1], kind) + leaf(150, 118, 22, 78, 26, up[0], up[1], kind) +
    leaf(150, 94, -125, 46, 17, up[0], up[1], "") + leaf(150, 94, -55, 46, 17, up[0], up[1], "");

  // big shiny eyes (different look for each deficiency)
  const ex = [130, 170], ey = 236;
  const shiny = (x) => `<circle cx="${x}" cy="${ey}" r="10.5" fill="${dark}"/><circle cx="${x + 3.5}" cy="${ey - 3.5}" r="3.6" fill="#fff"/><circle cx="${x - 3}" cy="${ey + 4}" r="1.8" fill="#fff"/>`;
  let eyes = ex.map(shiny).join(""), mouth = "M141 265 Q150 258 159 265", brows = true, extras = "";
  if (k === "Nitrogen") {            // sleepy
    eyes = `<path d="M120 236 Q130 245 140 236 M160 236 Q170 245 180 236" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    mouth = "M142 265 Q150 261 158 265";
    extras = `<text class="zz" x="205" y="92" font-size="26" font-weight="800" fill="#8a7a10">z Z</text><ellipse class="fall" cx="72" cy="95" rx="10" ry="5" fill="#e8dc4c" stroke="#bfa92a"/>`;
  } else if (k === "Potassium") {    // hot and sweaty
    eyes = `<path d="M121 228 L139 236 L121 244 M179 228 L161 236 L179 244" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    mouth = "M136 266 q4 -5 7 0 t7 0 t7 0 t7 0"; brows = false;
    extras = `<path class="tear" d="M214 214 q-8 13 0 18 q8 -5 0 -18z" fill="#7dd3fc"/><path class="tear d2" d="M84 222 q-6 10 0 14 q6 -4 0 -14z" fill="#7dd3fc"/>`;
  } else if (k === "Iron") {         // dizzy swirls
    eyes = ex.map((x) => `<circle cx="${x}" cy="${ey}" r="11" fill="#fff" stroke="${dark}" stroke-width="2.5"/><circle cx="${x}" cy="${ey}" r="5.5" fill="none" stroke="${dark}" stroke-width="2.5"/>`).join("");
    mouth = "M136 266 q4 -5 7 0 t7 0 t7 0 t7 0"; brows = false;
    extras = `<text class="star" x="84" y="66" font-size="26" fill="#f5b301">★</text><text class="star s2" x="208" y="80" font-size="20" fill="#f5b301">★</text><text class="star s3" x="116" y="42" font-size="16" fill="#f5b301">★</text>`;
  } else if (k === "Magnesium") {    // worried, wide eyes, open mouth
    eyes = ex.map((x) => `<circle cx="${x}" cy="${ey}" r="12" fill="#fff" stroke="${dark}" stroke-width="2"/><circle cx="${x + 1}" cy="${ey - 2}" r="6.5" fill="${dark}"/><circle cx="${x + 3}" cy="${ey - 4.5}" r="2.4" fill="#fff"/>`).join("");
    mouth = "";
    extras = `<ellipse cx="150" cy="266" rx="6.5" ry="5.5" fill="${dark}"/><text class="zz" x="208" y="100" font-size="30" font-weight="800" fill="#2f9e44">!?</text>`;
  }
  const browSvg = brows ? `<path d="M118 222 Q128 213 141 216 M182 222 Q172 213 159 216" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>` : "";
  const mouthSvg = mouth ? `<path d="${mouth}" stroke="${dark}" stroke-width="3.5" fill="none" stroke-linecap="round"/>` : "";
  const blush = `<ellipse cx="111" cy="255" rx="9" ry="5.5" fill="#ff8fa3" opacity=".55"/><ellipse cx="189" cy="255" rx="9" ry="5.5" fill="#ff8fa3" opacity=".55"/>`;

  const bottle = `<g class="bottle"><rect x="254" y="184" width="22" height="14" rx="4" fill="#92400e"/><rect x="257" y="196" width="16" height="9" fill="#e5e7eb"/>
      <rect x="241" y="203" width="48" height="72" rx="13" fill="${cure.color}"/><rect x="241" y="203" width="14" height="72" rx="7" fill="#fff" opacity=".18"/>
      <rect x="247" y="222" width="36" height="30" rx="6" fill="#fff"/>
      <text x="265" y="244" text-anchor="middle" font-size="17" font-weight="800" fill="${cure.color}">${cure.label}</text>
      <text class="star" x="234" y="192" font-size="18" fill="#f5b301">✦</text></g>`;

  return `<svg class="scene" viewBox="0 0 300 300" role="img" aria-label="${esc(r.plant)} with ${esc(r.deficiency)}">
    <defs>${grad("lg", C)}${grad("lgp", P)}
      <linearGradient id="pot" x1="0" x2="1"><stop offset="0" stop-color="#e58f5b"/><stop offset=".55" stop-color="#cf7443"/><stop offset="1" stop-color="#b0592a"/></linearGradient>
      <linearGradient id="rim" x1="0" x2="1"><stop offset="0" stop-color="#f0a870"/><stop offset="1" stop-color="#d98a52"/></linearGradient></defs>
    <circle cx="150" cy="165" r="125" fill="#fff" opacity=".35"/>
    <ellipse cx="150" cy="290" rx="72" ry="7" fill="#000" opacity=".12"/>
    <g class="sway"><path d="M150 186 C150 150 147 120 150 90" stroke="#5a9a2a" stroke-width="7" fill="none" stroke-linecap="round"/>${leaves}</g>
    ${extras}
    <path d="M97 198 H203 Q207 198 206 204 L193 272 Q191 284 179 284 H121 Q109 284 107 272 L94 204 Q93 198 97 198Z" fill="url(#pot)"/>
    <rect x="88" y="182" width="124" height="22" rx="11" fill="url(#rim)"/>
    <path d="M110 212 L116 266" stroke="#fff" stroke-opacity=".3" stroke-width="6" stroke-linecap="round"/>
    ${blush}<g class="eyes">${eyes}</g>${browSvg}${mouthSvg}
    ${k ? bottle : ""}</svg>`;
}

// ---------- Animated expert avatars (only shown in the profile popup) ----------
const PEOPLE = {
  1: { skin: "#f1c8a5", hair: "#2b1b12", style: "long",  top: "#ffffff", inner: "#16a34a", coat: true, glasses: true },
  2: { skin: "#c68a5e", hair: "#1f1a17", style: "short", top: "#16a34a", stache: true },
  3: { skin: "#d9a077", hair: "#3a2416", style: "bun",   top: "#ffffff", inner: "#0ea5e9", coat: true },
  4: { skin: "#e8b98f", hair: "#4a3020", style: "hat",   top: "#2563eb" },
  5: { skin: "#b9794f", hair: "#2a1a10", style: "bob",   top: "#f59e0b" }
};
function expertAvatar(x) {
  const p = PEOPLE[x.id] || PEOPLE[1], d = "#3b1f0d";
  const hairBack = p.style === "long"
    ? `<path d="M56 100 Q52 45 100 45 Q148 45 144 100 L152 156 Q100 170 48 156Z" fill="${p.hair}"/>`
    : p.style === "bob" ? `<path d="M56 105 Q50 48 100 48 Q150 48 144 105 Q144 130 130 132 L70 132 Q56 130 56 105Z" fill="${p.hair}"/>` : "";
  const coat = p.coat
    ? `<path d="M84 143 L100 168 L116 143Z" fill="${p.inner}"/><path d="M84 143 L100 174 M116 143 L100 174" stroke="#cbd5e1" stroke-width="2" fill="none"/>` : "";
  const fringe = `<path d="M60 90 Q58 50 100 50 Q142 50 140 90 Q124 68 100 70 Q76 68 60 90Z" fill="${p.hair}"/>`;
  let hairFront = fringe;
  if (p.style === "bun") hairFront = `<circle cx="100" cy="40" r="14" fill="${p.hair}"/>` + fringe;
  if (p.style === "hat") hairFront = `<path d="M62 76 Q62 38 100 38 Q138 38 138 76Z" fill="#facc15"/><rect x="63" y="65" width="74" height="7" fill="#b45309"/><ellipse cx="100" cy="76" rx="56" ry="9" fill="#eab308"/>`;
  const eye = (cx) => `<circle cx="${cx}" cy="98" r="5.5" fill="${d}"/><circle cx="${cx + 2}" cy="96" r="1.9" fill="#fff"/>`;
  const glasses = p.glasses ? `<g fill="rgba(255,255,255,.25)" stroke="#334155" stroke-width="2.5"><circle cx="85" cy="98" r="12"/><circle cx="115" cy="98" r="12"/><path d="M97 98 H103" fill="none"/></g>` : "";
  const stache = p.stache ? `<path d="M86 113 Q100 106 114 113 Q100 119 86 113Z" fill="${p.hair}"/>` : "";
  const mouthY = p.stache ? 121 : 116;
  return `<svg viewBox="0 0 200 200" role="img" aria-label="${esc(x.name)}">
    <g class="pbob">
    ${hairBack}
    <path d="M38 200 Q38 142 100 142 Q162 142 162 200Z" fill="${p.top}" stroke="#d1d5db" stroke-width="${p.coat ? 2 : 0}"/>${coat}
    <rect x="90" y="122" width="20" height="26" rx="8" fill="${p.skin}"/>
    <circle cx="61" cy="98" r="7" fill="${p.skin}"/><circle cx="139" cy="98" r="7" fill="${p.skin}"/>
    <circle cx="100" cy="92" r="40" fill="${p.skin}"/>
    ${hairFront}
    <ellipse cx="75" cy="110" rx="8" ry="5" fill="#ff8fa3" opacity=".5"/><ellipse cx="125" cy="110" rx="8" ry="5" fill="#ff8fa3" opacity=".5"/>
    <g class="peyes">${eye(85)}${eye(115)}</g>${glasses}${stache}
    <path d="M89 ${mouthY} Q100 ${mouthY + 11} 111 ${mouthY}" stroke="${d}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <g class="wave"><path d="M150 172 Q178 154 180 122" stroke="${p.top}" stroke-width="17" fill="none" stroke-linecap="round"/><circle cx="180" cy="112" r="10" fill="${p.skin}"/></g>
    <text class="zz" x="14" y="62" font-size="22">🌿</text>
    </g></svg>`;
}