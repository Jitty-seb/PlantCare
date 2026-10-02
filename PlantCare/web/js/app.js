// Apply the saved theme on every page (so it stays the same when you move between pages)
try {
  document.documentElement.dataset.theme = localStorage.getItem("theme") ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
} catch (e) { document.documentElement.dataset.theme = "light"; }

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
        <div class="actions">${expertBtn}<button class="btn ghost" id="dl" type="button">⬇ Download Report</button><button class="btn ghost" id="again" type="button">New Diagnosis</button></div>
      </div>
    </section>`;
  form.hidden = true;
  requestAnimationFrame(() => { const b = document.querySelector(".bar i"); if (b) b.style.width = b.dataset.w; });
  $("#dl").addEventListener("click", () => downloadReport(r));
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
          <div class="ex-top"><div class="avatar"><img class="aimg" src="assets/experts/expert-${x.id}.jpg" alt="" onerror="this.remove()">${esc(initials(x.name))}</div>
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
    <div class="pavatar">${expertAvatar(x)}<img class="pimg" src="assets/experts/expert-${x.id}.jpg" alt="${esc(x.name)}" onerror="this.remove()"></div>
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
  "Choose your plant": "നിങ്ങളുടെ ചെടി തിരഞ്ഞെടുക്കുക", "Tomato, Rice, Potato, Chilli or Banana.": "തക്കാളി, അരി, ഉരുളകിഴങ്ങ്, മുളക് അല്ലെങ്കിൽ വാഴ.",
  "Pick every visible sign — a scoring system weighs them together.": "കാണാവുന്ന എല്ലാ ലക്ഷണങ്ങളും തിരഞ്ഞെടുക്കുക — ഒരു സ്കോറിംഗ് സിസ്റ്റം അവയെ ഒന്നിച്ച് വിലയിരുത്തുന്നു.",
  " Get guidance": " മാർഗനിർദേശം നേടുക", "See the likely deficiency, confidence, treatment and prevention.": "സാധ്യമായ പോഷകക്കുറവ്, വിശ്വാസ്യത, ചികിത്സയും പ്രതിരോധവും കാണുക.",
  "Nitrogen": "നൈട്രജൻ", "Potassium": "പൊട്ടാസ്യം", "Iron": "ഇരുമ്പ്", "Magnesium": "മഗ്നീഷ്യം", "Two quick steps. The Java backend analyses your symptoms.": "രണ്ട് എളുപ്പവഴികൾ. നിങ്ങളുടെ ലക്ഷണങ്ങൾ ജാവ ബാക്ക്എൻഡ് വിശകലനം ചെയ്യുന്നു.",
  "Yellow older leaves, slow growth": "മഞ്ഞ പഴയ ഇലകൾ, വളർച്ച കുറവ്", "Brown edges, leaf curling": "ഇലയുടെ അരികുകൾ തവിട്ടുനിറം, ഇല ചുരുളൽ", "(choose all that apply)": "(പ്രയോഗിക്കാവുന്ന എല്ലാ ലക്ഷണങ്ങളും തിരഞ്ഞെടുക്കുക)",
  "Pale new leaves": "വിളറിയ പുതിയ ഇലകൾ", "Yellowing between veins": "ഞരമ്പുകൾക്കിടയിൽ മഞ്ഞളിപ്പ്", "Tomato": "തക്കാളി", "Rice": "അരി", "Potato": "ഉരുളകിഴങ്ങ്", "Chilli": "മുളക്", "Banana": "വാഴ",
  "Maize": "മക്ക", "Brinjal": "വെണ്ട", "Okra": "വെണ്ടയ്ക്ക", "Coconut": "തേങ്ങ", "Dr. Anu Thomas": "ഡോ. അനു തോമസ്", "Rajesh Menon": "രാജേഷ് മേനോൻ", "Dr. Meera Nair": "ഡോ. മീര നായർ", "Suresh Kumar": "സുരേഷ് കുമാർ", "Fathima Beevi": "ഫാത്തിമ ബീവി",
  "Dr. Suresh Kumar": "ഡോ. സുരേഷ് കുമാർ", "Dr. Meera Varma": "ഡോ. മീര വർമ്മ","Plant Nutrition Specialist": "ചെടി പോഷക വിദഗ്ധർ","Soil Health Consultant": "മണ്ണിന്റെ ആരോഗ്യ ഉപദേഷ്ടാവ്","Horticulture Advisor": "തോട്ടം ഉപദേഷ്ടാവ്","Organic Farming Advisor": "ഓർഗാനിക് കൃഷി ഉപദേഷ്ടാവ്",
  "Helps farmers correct nutrient imbalances in vegetable and banana crops.": "പച്ചക്കറി, വാഴ എന്നിവയിൽ പോഷക അസമത്വങ്ങൾ ശരിയാക്കാൻ കർഷകരെ സഹായിക്കുന്നു.",
  "Specialises in soil testing, fertilizer planning and improving soil fertility.": "മണ്ണ് പരിശോധന, വളം പദ്ധതിയിടൽ, മണ്ണിന്റെ ഉത്പാദനക്ഷമത മെച്ചപ്പെടുത്തൽ എന്നിവയിൽ വിദഗ്ധത.",
  "Works on micronutrient problems such as iron and magnesium shortage.": "ഇരുമ്പ്, മഗ്നീഷ്യം എന്നിവയുടെ കുറവ് പോലുള്ള സൂക്ഷ്മ പോഷക പ്രശ്നങ്ങളിൽ പ്രവർത്തിക്കുന്നു.",
  "Guides small growers on tomato, chilli and potato crop care.": "തക്കാളി, മുളക്, ഉരുളകിഴങ്ങ് എന്നിവയുടെ വിള സംരക്ഷണത്തിൽ ചെറിയ കർഷകരെ മാർഗനിർദേശിക്കുന്നു.",
  "Promotes compost and organic nutrient management for healthier plants.": "ആരോഗ്യമുള്ള ചെടികൾക്കായി കമ്പോസ്റ്റ്, ഓർഗാനിക് പോഷക നിയന്ത്രണം പ്രോത്സാഹിപ്പിക്കുന്നു.",
  "A prototype directory of plant nutrition experts (sample data).": "ചെടി പോഷക വിദഗ്ധരുടെ പ്രോട്ടോടൈപ്പ് ഡയറക്ടറി (സാമ്പിൾ ഡാറ്റ).","Hi, I'm Anu! Ask me about Nitrogen, Iron, Magnesium.": "ഹായ്, ഞാൻ അനു! നൈട്രജൻ, ഇരുമ്പ്, മഗ്നീഷ്യം എന്നിവയെക്കുറിച്ച് എനിക്ക് ചോദിക്കൂ.",
  "Hi, I'm Rajesh! Ask me about Nitrogen, Potassium.": "ഹായ്, ഞാൻ രാജേഷ്! നൈട്രജൻ, പൊട്ടാസ്യം എന്നിവയെക്കുറിച്ച് എനിക്ക് ചോദിക്കൂ.", "Hi, I'm Meera! Ask me about Iron, Magnesium.": "ഹായ്, ഞാൻ മീര! ഇരുമ്പ്, മഗ്നീഷ്യം എന്നിവയെക്കുറിച്ച് എനിക്ക് ചോദിക്കൂ.", 
  "Hi, I'm Suresh! Ask me about Potassium, Magnesium, Nitrogen.": "ഹായ്, ഞാൻ സുരേഷ്! പൊട്ടാസ്യം, മഗ്നീഷ്യം, നൈട്രജൻ എന്നിവയെക്കുറിച്ച് എനിക്ക് ചോദിക്കൂ.", "Hi, I'm Fathima! Ask me about Nitrogen, Potassium, Iron.": "ഹായ്, ഞാൻ ഫാത്തിമ! നൈട്രജൻ, പൊട്ടാസ്യം, ഇരുമ്പ് എന്നിവയെക്കുറിച്ച് എനിക്ക് ചോദിക്കൂ.",
  "Identify possible nutrient deficiencies from visible plant symptoms and get practical guidance.": "ചെടിയിൽ കാണുന്ന ലക്ഷണങ്ങളിൽ നിന്ന് സാധ്യമായ പോഷകക്കുറവുകൾ തിരിച്ചറിഞ്ഞ് പ്രായോഗിക മാർഗനിർദേശം നേടുക.",
  "Start Diagnosis →": "രോഗനിർണയം തുടങ്ങുക →", "Meet Experts": "വിദഗ്ധരെ കാണുക",
  "How it works": "ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു", "Nutrients we check": "ഞങ്ങൾ പരിശോധിക്കുന്ന പോഷകങ്ങൾ",
  "Plant Diagnosis": "ചെടി രോഗനിർണയം", "Select plant": "ചെടി തിരഞ്ഞെടുക്കുക", "Choose a plant…": "ചെടി തരയ്‌പറയല്‍…",
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

// ---------- Illustrated expert portraits (shown in the profile popup; real photos override them) ----------
const PEOPLE = {
  1: { f: true, skin: ["#e8b88f", "#d9a074", "#b9805a"], hair: "#2b1b12", style: "long", top: "#f8fafc", inner: "#16a34a", coat: true, glasses: true, bg: ["#c9ece6", "#7cc7b8"] },
  2: { skin: ["#cc916a", "#b87a52", "#94603d"], hair: "#1f1a17", style: "short", top: "#2f8f4e", stache: true, bg: ["#fde9b8", "#9fd18b"] },
  3: { f: true, skin: ["#e0ab82", "#cf9468", "#a97048"], hair: "#3a2416", style: "bun", top: "#f8fafc", inner: "#0ea5e9", coat: true, bg: ["#d6e6f7", "#9cc3e8"] },
  4: { skin: ["#d69d72", "#c28659", "#9c6843"], hair: "#4a3020", style: "hat", top: "#2563eb", bg: ["#d8f0c4", "#7fc06b"] },
  5: { f: true, skin: ["#bd855d", "#a96f48", "#865433"], hair: "#2a1a10", style: "bob", top: "#f59e0b", bg: ["#ffe4c7", "#a8d08d"] }
};
function expertAvatar(x) {
  const p = PEOPLE[x.id] || PEOPLE[1], [sl, sm, sd] = p.skin, d = "#2a1608";
  const lip = p.f ? "#bf5650" : "#9c5a4c";

  // hair behind the head (long / bob)
  const hairBack = p.style === "long"
    ? `<path d="M58 96 Q54 46 100 44 Q146 46 142 96 L148 162 Q100 174 52 162Z" fill="${p.hair}"/>`
    : p.style === "bob"
      ? `<path d="M57 100 Q52 46 100 44 Q148 46 143 100 Q143 128 128 132 L72 132 Q57 128 57 100Z" fill="${p.hair}"/>` : "";

  // shoulders: lab coat with shirt + badge, or a plain shirt with a V neckline
  const body = `<rect x="88" y="120" width="24" height="34" rx="10" fill="${sm}"/>
    <path d="M26 200 Q28 150 78 144 L100 158 L122 144 Q172 150 174 200Z" fill="${p.top}"/>
    <path d="M122 144 Q172 150 174 200 L140 200 Q150 160 122 144Z" fill="#000" opacity=".07"/>`
    + (p.coat
      ? `<path d="M84 144 L100 176 L116 144Z" fill="${p.inner}"/><path d="M78 144 L98 184 M122 144 L102 184" stroke="#cbd5e1" stroke-width="2" fill="none"/>
         <rect x="126" y="166" width="17" height="11" rx="2" fill="#fff" stroke="#9ca3af"/><rect x="129" y="169" width="6" height="2.2" fill="#16a34a"/><rect x="129" y="173" width="10" height="1.6" fill="#9ca3af"/>`
      : `<path d="M82 144 L100 168 L118 144Z" fill="${sm}"/><path d="M78 144 L100 170 L122 144" stroke="#000" stroke-opacity=".15" stroke-width="2" fill="none"/>`)
    + `<ellipse cx="100" cy="134" rx="20" ry="9" fill="#000" opacity=".14"/>`;

  // hair in front of the head
  const fringe = `<path d="M62 92 Q60 50 100 50 Q140 50 138 92 Q130 66 104 62 Q80 64 62 92Z" fill="${p.hair}"/><path d="M72 68 Q86 56 108 58" stroke="#fff" stroke-opacity=".18" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  let hairFront = fringe;
  if (p.style === "bun") hairFront = `<circle cx="100" cy="38" r="13" fill="${p.hair}"/>` + fringe;
  if (p.style === "short") hairFront = `<path d="M63 90 Q60 46 100 46 Q140 46 137 90 Q134 66 118 60 Q100 56 82 60 Q66 66 63 90Z" fill="${p.hair}"/><path d="M76 62 Q92 52 114 56" stroke="#fff" stroke-opacity=".15" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const hat = p.style === "hat"
    ? `<ellipse cx="100" cy="82" rx="38" ry="6" fill="#000" opacity=".16"/>
       <path d="M64 74 Q66 34 100 34 Q134 34 136 74Z" fill="#e8c05a"/><rect x="64" y="64" width="72" height="8" fill="#9a5b1f"/>
       <path d="M74 50 Q100 42 126 50 M70 58 Q100 50 130 58" stroke="#c8952b" stroke-opacity=".6" stroke-width="2" fill="none"/>
       <ellipse cx="100" cy="74" rx="58" ry="10" fill="#d9a93f"/>` : "";
  if (p.style === "hat") hairFront = `<path d="M63 80 Q61 96 64 108 L68 100Z M137 80 Q139 96 136 108 L132 100Z" fill="${p.hair}"/>`;

  // face details
  const eye = (cx) => `<path d="M${cx - 8} 92 Q${cx} 85 ${cx + 8} 92 Q${cx} 98 ${cx - 8} 92Z" fill="#fff"/><circle cx="${cx}" cy="92" r="4.3" fill="#4a2c17"/><circle cx="${cx}" cy="92" r="2" fill="#120a04"/><circle cx="${cx + 1.4}" cy="90.6" r="1.2" fill="#fff"/><path d="M${cx - 8} 92 Q${cx} 85 ${cx + 8} 92" stroke="${d}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
  const brows = `<path d="M76 82 Q85 77 94 81 M106 81 Q115 77 124 82" stroke="${p.hair}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const nose = `<path d="M100 95 L98 107 Q100 110 104 107" stroke="${sd}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  const my = p.stache ? 120 : 117;
  const mouth = `<path d="M89 ${my} Q100 ${my + 10} 111 ${my} Q100 ${my + 4} 89 ${my}Z" fill="${lip}"/>`;
  const stache = p.stache ? `<path d="M87 114 Q100 107 113 114 Q100 117 87 114Z" fill="${p.hair}"/><ellipse cx="100" cy="122" rx="24" ry="14" fill="${p.hair}" opacity=".1"/>` : "";
  const glasses = p.glasses ? `<g fill="rgba(255,255,255,.12)" stroke="#1f2937" stroke-width="2"><rect x="73" y="83" width="24" height="18" rx="7"/><rect x="103" y="83" width="24" height="18" rx="7"/><path d="M97 91 H103 M73 90 L65 88 M127 90 L135 88" fill="none"/></g>` : "";
  const blush = `<ellipse cx="77" cy="108" rx="7" ry="4" fill="#e07a6b" opacity=".25"/><ellipse cx="123" cy="108" rx="7" ry="4" fill="#e07a6b" opacity=".25"/>`;

  return `<svg viewBox="0 0 200 200" role="img" aria-label="${esc(x.name)}">
    <defs><linearGradient id="bgp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient>
      <radialGradient id="sk" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="${sl}"/><stop offset=".7" stop-color="${sm}"/><stop offset="1" stop-color="${sd}"/></radialGradient></defs>
    <rect width="200" height="200" fill="url(#bgp)"/>
    <circle cx="28" cy="46" r="26" fill="#fff" opacity=".2"/><circle cx="172" cy="70" r="34" fill="#fff" opacity=".16"/><circle cx="160" cy="26" r="14" fill="#fff" opacity=".22"/>
    <path d="M0 200 Q20 150 60 140 Q30 170 40 200Z" fill="#1f7a3a" opacity=".25"/><path d="M200 200 Q184 160 150 150 Q176 176 168 200Z" fill="#1f7a3a" opacity=".25"/>
    <g class="phead">${hairBack}</g>
    <g class="pbody">${body}</g>
    <g class="phead">
      <ellipse cx="64" cy="95" rx="5" ry="8" fill="${sm}"/><ellipse cx="136" cy="95" rx="5" ry="8" fill="${sm}"/>
      <ellipse cx="100" cy="92" rx="35" ry="43" fill="url(#sk)"/>
      ${blush}${brows}<g class="peyes">${eye(85)}${eye(115)}</g>${glasses}${nose}${mouth}${stache}
      ${hairFront}${hat}
    </g></svg>`;
}
// ---------- Dark / light theme ----------
const themeBtn = document.createElement("button");
themeBtn.className = "langbtn themebtn"; themeBtn.type = "button";
function paintThemeBtn() {
  const dark = document.documentElement.dataset.theme === "dark";
  themeBtn.textContent = dark ? "☀️" : "🌙";
  themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
}
themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch (e) { /* ignore */ }
  paintThemeBtn();
});
paintThemeBtn();
$(".nav nav").appendChild(themeBtn);

// ---------- Whimsical nature: floating fireflies ----------
(function nature() {
  let seed = 7;                                           // fixed seed => same look on every page
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  for (let i = 0; i < 16; i++) {                     // fireflies / pollen drifting in the background
    const f = document.createElement("span");
    f.className = "fly";
    f.style.cssText = `left:${(rnd() * 100).toFixed(1)}%;top:${(rnd() * 100).toFixed(1)}%;--t:${(5 + rnd() * 6).toFixed(1)}s;--d:-${(rnd() * 8).toFixed(1)}s`;
    document.body.appendChild(f);
  }
})();

// ---------- Download report (a small PDF written by hand - no library needed) ----------
ML["Download Report"] = "റിപ്പോർട്ട് ഡൗൺലോഡ് ചെയ്യുക";

function makePDF(r) {
  const W = 595, H = 842, M = 48;                         // A4 page in points
  const ascii = (t) => String(t).replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014\u00B7]/g, "-").replace(/[^\x20-\x7E]/g, "");
  const pdfText = (t) => ascii(t).replace(/([\\()])/g, "\\$1");
  const pages = [""];
  let y = H - 125;
  const put = (c) => { pages[pages.length - 1] += c; };

  // green header band
  put(`0.09 0.64 0.29 rg 0 ${H - 95} ${W} 95 re f\n`);
  put(`BT /F2 26 Tf 1 1 1 rg ${M} ${H - 50} Td (PlantCare - Diagnosis Report) Tj ET\n`);
  put(`BT /F1 11 Tf 0.9 1 0.92 rg ${M} ${H - 74} Td (Smart Plant Health & Expert Connect) Tj ET\n`);

  // writes wrapped text, starting a new page when needed
  function text(t, size, bold, rgb) {
    const max = Math.floor((W - 2 * M) / (size * 0.52));
    let line = "";
    const flush = () => {
      if (y < 70) { pages.push(""); y = H - 60; }
      put(`BT /${bold ? "F2" : "F1"} ${size} Tf ${rgb} rg ${M} ${y} Td (${pdfText(line)}) Tj ET\n`);
      y -= size + 6; line = "";
    };
    for (const w of ascii(t).split(/\s+/).filter(Boolean)) {
      if (line && (line + " " + w).length > max) flush();
      line = line ? line + " " + w : w;
    }
    if (line) flush();
  }
  const heading = (t) => { y -= 8; text(t.toUpperCase(), 10, true, "0.09 0.5 0.25"); };
  const body = (t) => text(t, 12, false, "0.1 0.14 0.12");

  text(`Date: ${new Date().toLocaleString("en-GB")}`, 10, false, "0.4 0.45 0.42");
  y -= 6;
  heading("Plant"); body(r.plant);
  heading("Possible deficiency"); text(r.deficiency, 20, true, "0.06 0.33 0.18");
  heading("Confidence");
  body(`${r.confidence} (score ${r.score})`);
  const pct = { HIGH: 1, MEDIUM: 0.66, LOW: 0.33 }[r.confidence] || 0.33;
  const col = { HIGH: "0.09 0.64 0.29", MEDIUM: "0.92 0.7 0.03", LOW: "0.98 0.45 0.09" }[r.confidence] || "0.98 0.45 0.09";
  put(`0.88 0.92 0.9 rg ${M} ${y} 220 9 re f\n${col} rg ${M} ${y} ${Math.round(220 * pct)} 9 re f\n`);
  y -= 22;
  heading("Matched symptoms");
  (r.matched.length ? r.matched : ["None"]).forEach((m) => body("- " + m));
  heading("Recommended action"); body(r.treatment);
  heading("Prevention"); body(r.prevention);
  heading("Why this result?"); body(r.explanation);
  if (r.preliminary) {
    y -= 8;
    text("NOTE: This result is preliminary. Please consult an agricultural expert.", 11, true, "0.7 0.3 0.04");
  }
  y -= 14;
  text("PlantCare provides preliminary symptom-based guidance and is not a substitute for professional agricultural diagnosis.", 9, false, "0.4 0.45 0.42");

  // assemble the PDF file: objects 1-4 are catalog, page list and two fonts; then a page + content stream per page
  const objs = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + 2 * i} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  pages.forEach((c, i) => {
    objs[5 + 2 * i] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + 2 * i} 0 R >>`;
    objs[6 + 2 * i] = `<< /Length ${c.length} >>\nstream\n${c}\nendstream`;
  });
  let pdf = "%PDF-1.4\n";
  const offs = [];
  for (let i = 1; i < objs.length; i++) { offs[i] = pdf.length; pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`; }
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n` + offs.slice(1).map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("");
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function downloadReport(r) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(makePDF(r));
  a.download = `PlantCare-${r.plant}-${r.deficiency.replace(/[^A-Za-z]+/g, "-")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}