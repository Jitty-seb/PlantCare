package plantcare;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Built-in Java HTTP server: serves the web/ files and answers the /api/... requests. */
public class WebServer {
    private DiagnosisSystem diagnosisSystem = new DiagnosisSystem();
    private ExpertManager expertManager = new ExpertManager();
    private List<String> plants = List.of("Tomato", "Rice", "Potato", "Chilli", "Banana", "Maize", "Brinjal", "Okra", "Coconut");

    public void start(int port) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        // Each context = one URL path handled by one method.
        server.createContext("/api/diagnose", this::handleDiagnose); // plant + symptoms -> result
        server.createContext("/api/experts", this::handleExperts);   // list / filter experts
        server.createContext("/api/expert", this::handleExpert);     // one expert profile
        server.createContext("/api/history", this::handleHistory);   // last 5 diagnoses
        server.createContext("/", this::handleStatic);               // HTML / CSS / JS files
        server.start();
        System.out.println("PlantCare running at http://localhost:" + port);
    }

    // GET /api/diagnose?plant=Tomato&symptoms=yellow_leaves,slow_growth
    private void handleDiagnose(HttpExchange ex) throws IOException {
        Map<String, String> q = params(ex);
        String plantName = q.getOrDefault("plant", "");
        String symptomText = q.getOrDefault("symptoms", "");

        if (!plants.contains(plantName) || symptomText.isEmpty()) {
            send(ex, 400, "application/json", "{\"error\":\"Select a valid plant and at least one symptom.\"}");
            return;
        }
        List<String> symptoms = Arrays.asList(symptomText.split(","));
        String json = diagnosisSystem.diagnose(new Plant(plantName), symptoms); // Java does the diagnosis
        send(ex, 200, "application/json", json);
    }

    // GET /api/history -> last 5 diagnoses saved in history.txt
    private void handleHistory(HttpExchange ex) throws IOException {
        send(ex, 200, "application/json", diagnosisSystem.historyJson());
    }

    // GET /api/experts  or  /api/experts?deficiency=Nitrogen
    private void handleExperts(HttpExchange ex) throws IOException {
        String key = params(ex).getOrDefault("deficiency", "");
        send(ex, 200, "application/json", expertManager.listJson(key));
    }

    // GET /api/expert?id=1
    private void handleExpert(HttpExchange ex) throws IOException {
        try {
            int id = Integer.parseInt(params(ex).getOrDefault("id", ""));
            Expert e = expertManager.findById(id);
            if (e == null) send(ex, 404, "application/json", "{\"error\":\"Expert not found.\"}");
            else send(ex, 200, "application/json", e.toJson());
        } catch (NumberFormatException e) {
            send(ex, 400, "application/json", "{\"error\":\"Invalid expert id.\"}");
        }
    }

    // Serves files from the web/ folder (run the program from the PlantCare folder).
    private void handleStatic(HttpExchange ex) throws IOException {
        String path = ex.getRequestURI().getPath();
        if (path.equals("/")) path = "/index.html";
        Path root = Path.of("web").toAbsolutePath().normalize();
        Path file = root.resolve(path.substring(1)).normalize();

        if (!file.startsWith(root) || !Files.isRegularFile(file)) { // blocks ../ tricks
            send(ex, 404, "text/plain", "404 Not Found");
            return;
        }
        String type = "application/octet-stream";
        if (path.endsWith(".html")) type = "text/html";
        else if (path.endsWith(".css")) type = "text/css";
        else if (path.endsWith(".js")) type = "application/javascript";
        else if (path.endsWith(".png")) type = "image/png";
        else if (path.endsWith(".jpg")) type = "image/jpeg";
        else if (path.endsWith(".svg")) type = "image/svg+xml";
        sendBytes(ex, 200, type, Files.readAllBytes(file));
    }

    /** Reads ?a=1&b=2 from the URL into a Map. */
    private Map<String, String> params(HttpExchange ex) {
        Map<String, String> map = new HashMap<>();
        String query = ex.getRequestURI().getRawQuery();
        if (query == null) return map;
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2) {
                map.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8),
                        URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
            }
        }
        return map;
    }

    private void send(HttpExchange ex, int status, String type, String body) throws IOException {
        sendBytes(ex, status, type, body.getBytes(StandardCharsets.UTF_8));
    }

    private void sendBytes(HttpExchange ex, int status, String type, byte[] data) throws IOException {
        ex.getResponseHeaders().set("Content-Type", type + "; charset=utf-8");
        ex.sendResponseHeaders(status, data.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(data);
        }
    }
}