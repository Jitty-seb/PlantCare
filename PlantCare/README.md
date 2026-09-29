# 🌱 PlantCare – Smart Plant Health & Expert Connect

Browser (HTML/CSS/JS) → HTTP request → Java `WebServer` → `DiagnosisSystem` → OOP classes → JSON → browser.

## Run (VS Code, Java 21, no libraries)
Open a terminal **in the PlantCare folder** (the server reads `web/` from the current folder):

    javac -d out src/plantcare/*.java
    java -cp out plantcare.Main

Open http://localhost:8080  (stop with Ctrl+C). Check Java: `java -version` → 21.

## Files
- `Plant` – encapsulated plant (private name, constructor, getter)
- `Deficiency` – abstract parent; `Nitrogen/Potassium/Iron/MagnesiumDeficiency` extend it and override `scoreFor`, `getTreatment`, `getPrevention`, `getSymptomInfo`
- `DiagnosisSystem` – scores every deficiency, picks the highest, decides confidence, builds JSON
- `Expert`, `ExpertManager` – expert data in an `ArrayList<Expert>`, rule-based filter by deficiency
- `WebServer` – built-in `HttpServer`: static files + `/api/diagnose`, `/api/experts`, `/api/expert`
- `Main` – starts the server

## Request flow
1. User picks plant + symptoms on `diagnose.html`; `app.js` validates them.
2. `fetch("/api/diagnose?plant=Tomato&symptoms=yellow_leaves,slow_growth")`
3. `WebServer.handleDiagnose` creates `new Plant(...)`, calls `DiagnosisSystem.diagnose(...)`.
4. For each `Deficiency` in the list, `scoreFor(symptom)` is called (polymorphism); the highest total wins.
5. JSON returns; `app.js` draws the result card. "Find an Expert" opens `experts.html?deficiency=Nitrogen`, which calls `/api/experts?deficiency=Nitrogen`.

## Scoring
Nitrogen: yellow leaves 2, slow growth 2 · Potassium: brown edges 2, curling 1, yellow leaves 1 · Iron: pale/new leaves 2, interveinal yellowing 1 · Magnesium: interveinal yellowing 2, yellow leaves 1.
Confidence: ≥4 HIGH, 2–3 MEDIUM, 1 LOW. A tie or LOW result is flagged "preliminary".

## OOP concepts used
Classes/objects, constructors, encapsulation (private fields + getters), inheritance (`extends Deficiency`), abstract class, method overriding (`@Override`), polymorphism (`ArrayList<Deficiency>` calling `d.scoreFor(...)`), ArrayList, switch, loops, try/catch (`Main`, `handleExpert`), packages.

## 2-minute demo script
1. Landing page: name, tagline, "Start Diagnosis".
2. Choose Tomato, tick *Yellow leaves* + *Slow growth* → Nitrogen, HIGH, matched symptoms, treatment.
3. Tick only *Yellow leaves* → MEDIUM/preliminary warning shows the honest scoring.
4. Show the tie case: *Yellow leaves* + *Yellowing between veins* → preliminary note.
5. Click Find an Expert → filtered cards → View Profile.
6. Show `DiagnosisSystem.java` and the inheritance tree.

## Viva questions
- **Why Java backend?** The diagnosis rules live in OOP classes; JS only shows the UI.
- **Where is polymorphism?** `d.scoreFor(s)` and `d.getTreatment()` on a `Deficiency` reference run the subclass version.
- **Why abstract?** A generic "Deficiency" has no scores or treatment; each subclass must define its own.
- **How does the browser talk to Java?** `fetch()` sends an HTTP GET; `HttpServer` routes it to a handler method.
- **Why not a database?** Experts are a fixed ArrayList; this is a prototype.
- **Is it an AI diagnosis?** No, it is a transparent points system.
- **How is a tie handled?** `ties` counts equal top scores; the result is marked preliminary.
- **Why GET, not POST?** Simplest for beginners, no body parsing needed; POST + JSON is a future upgrade.

## Future improvements
Diagnosis history saved to a text file, English/Malayalam toggle, more plants/symptoms, plant photos in `web/assets/plant-images`, plant-specific scoring, POST + JSON body.

*PlantCare provides preliminary symptom-based guidance and is not a substitute for professional agricultural diagnosis.*
