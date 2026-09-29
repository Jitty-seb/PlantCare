package plantcare;

import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * The "brain" of PlantCare. Scores every deficiency for the selected symptoms,
 * picks the highest score and builds the result as a JSON string.
 */
public class DiagnosisSystem {
    // POLYMORPHISM: one list holds Nitrogen/Potassium/Iron/Magnesium objects as "Deficiency"
    private ArrayList<Deficiency> deficiencies = new ArrayList<>();

    public DiagnosisSystem() {
        deficiencies.add(new NitrogenDeficiency());
        deficiencies.add(new PotassiumDeficiency());
        deficiencies.add(new IronDeficiency());
        deficiencies.add(new MagnesiumDeficiency());
    }

    /** Converts a symptom id sent by the browser into readable text. */
    public static String label(String id) {
        switch (id) {
            case "yellow_leaves": return "Yellow leaves";
            case "slow_growth": return "Slow growth";
            case "brown_edges": return "Brown leaf edges";
            case "leaf_curling": return "Leaf curling";
            case "pale_new_leaves": return "Pale/new leaves";
            case "interveinal_yellowing": return "Yellowing between veins";
            case "weak_stems": return "Weak stems";
            case "leaf_drop": return "Early leaf drop";
            default: return id;
        }
    }

    /** score >= 4 HIGH, 2-3 MEDIUM, 1 LOW */
    private String confidenceFor(int score) {
        if (score >= 4) return "HIGH";
        if (score >= 2) return "MEDIUM";
        return "LOW";
    }

    public String diagnose(Plant plant, List<String> symptoms) {
        Deficiency winner = null;
        int best = 0, ties = 0;

        for (Deficiency d : deficiencies) {
            int score = 0;
            for (String s : symptoms) {
                score += d.scoreFor(s);          // polymorphic call: each subclass has its own scores
            }
            if (score > best) { best = score; winner = d; ties = 1; }
            else if (score == best && score > 0) { ties++; }
        }

        if (winner == null) {
            return "{\"plant\":" + quote(plant.getName()) + ",\"deficiency\":\"No clear match\",\"key\":\"\","
                + "\"score\":0,\"confidence\":\"LOW\",\"matched\":[],\"preliminary\":true,"
                + "\"treatment\":\"Monitor the plant and consult an agricultural expert.\","
                + "\"prevention\":\"Maintain balanced soil nutrition and regular monitoring.\","
                + "\"explanation\":\"The selected symptoms did not match any known deficiency in this prototype.\"}";
        }

        ArrayList<String> matched = new ArrayList<>();
        for (String s : symptoms) {
            if (winner.scoreFor(s) > 0) matched.add(quote(label(s)));
        }

        String confidence = confidenceFor(best);
        boolean preliminary = ties > 1 || best < 2;
        String explanation = winner.getSymptomInfo() + " It scored " + best + " point(s) for "
            + plant.getName() + " based on your symptoms.";
        if (ties > 1) {
            explanation += " Another deficiency scored equally, so this result is preliminary - please consult an agricultural expert.";
        } else if (confidence.equals("LOW")) {
            explanation += " Evidence is weak, so this result is preliminary - please consult an agricultural expert.";
        }

        saveHistory(plant.getName(), winner.getName(), confidence);
        return "{\"plant\":" + quote(plant.getName())
            + ",\"deficiency\":" + quote(winner.getName())
            + ",\"key\":" + quote(winner.getKey())
            + ",\"score\":" + best
            + ",\"confidence\":" + quote(confidence)
            + ",\"matched\":[" + String.join(",", matched) + "]"
            + ",\"preliminary\":" + preliminary
            + ",\"treatment\":" + quote(winner.getTreatment())
            + ",\"prevention\":" + quote(winner.getPrevention())
            + ",\"explanation\":" + quote(explanation) + "}";
    }

    private static final String HISTORY_FILE = "history.txt";

    /** Adds one line to history.txt: time|plant|deficiency|confidence (file handling, no database). */
    private void saveHistory(String plant, String deficiency, String confidence) {
        try (FileWriter fw = new FileWriter(HISTORY_FILE, true)) {
            String time = LocalDateTime.now().toString().substring(0, 16).replace("T", " ");
            fw.write(time + "|" + plant + "|" + deficiency + "|" + confidence + "\n");
        } catch (IOException e) {
            System.out.println("Could not save history: " + e.getMessage());
        }
    }

    /** Reads the last 5 lines of history.txt (newest first) as a JSON array. */
    public String historyJson() {
        ArrayList<String> items = new ArrayList<>();
        try {
            List<String> lines = Files.readAllLines(Path.of(HISTORY_FILE));
            for (int i = lines.size() - 1; i >= 0 && items.size() < 5; i--) {
                String[] p = lines.get(i).split("\\|");
                if (p.length == 4) {
                    items.add("{\"time\":" + quote(p[0]) + ",\"plant\":" + quote(p[1])
                        + ",\"deficiency\":" + quote(p[2]) + ",\"confidence\":" + quote(p[3]) + "}");
                }
            }
        } catch (IOException e) {
            // no history file yet - return an empty list
        }
        return "[" + String.join(",", items) + "]";
    }

    /** Wraps text in quotes and escapes special characters so the JSON stays valid. */
    public static String quote(String text) {
        return "\"" + text.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ") + "\"";
    }
}