package plantcare;

import java.util.ArrayList;

/** One predefined expert (prototype directory - not a real network). */
public class Expert {
    private int id;
    private String name, specialization, location, description;
    private int years;
    private ArrayList<String> deficiencies; // keys like "Nitrogen"

    public Expert(int id, String name, String specialization, int years,
                  String location, String description, ArrayList<String> deficiencies) {
        this.id = id;
        this.name = name;
        this.specialization = specialization;
        this.years = years;
        this.location = location;
        this.description = description;
        this.deficiencies = deficiencies;
    }

    public int getId() { return id; }
    public String getName() { return name; }

    /** Rule used for recommendation: does this expert handle the given deficiency? */
    public boolean handles(String key) { return deficiencies.contains(key); }

    public String toJson() {
        ArrayList<String> q = new ArrayList<>();
        for (String d : deficiencies) q.add(DiagnosisSystem.quote(d));
        return "{\"id\":" + id + ",\"name\":" + DiagnosisSystem.quote(name)
            + ",\"specialization\":" + DiagnosisSystem.quote(specialization)
            + ",\"years\":" + years + ",\"location\":" + DiagnosisSystem.quote(location)
            + ",\"description\":" + DiagnosisSystem.quote(description)
            + ",\"deficiencies\":[" + String.join(",", q) + "]}";
    }
}
