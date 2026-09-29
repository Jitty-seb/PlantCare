package plantcare;

/**
 * Parent class for all nutrient deficiencies.
 * Subclasses OVERRIDE the abstract methods, so each gives its own scores and advice.
 */
public abstract class Deficiency {
    private String key;   // short id, e.g. "Nitrogen"
    private String name;  // display name, e.g. "Nitrogen Deficiency"

    public Deficiency(String key, String name) {
        this.key = key;
        this.name = name;
    }

    public String getKey() { return key; }
    public String getName() { return name; }

    /** Points this deficiency gets for one symptom id (0 = not related). */
    public abstract int scoreFor(String symptom);
    public abstract String getTreatment();
    public abstract String getPrevention();
    public abstract String getSymptomInfo();
}
