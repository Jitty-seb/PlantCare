package plantcare;

/** Potassium deficiency: extends Deficiency and overrides its methods. */
public class PotassiumDeficiency extends Deficiency {

    public PotassiumDeficiency() { super("Potassium", "Potassium Deficiency"); }

    @Override
    public int scoreFor(String symptom) {
        switch (symptom) {
            case "brown_edges": return 2;
            case "leaf_curling": return 1;
            case "yellow_leaves": return 1;
            case "weak_stems": return 1;
            default: return 0;
        }
    }

    @Override
    public String getTreatment() { return "Use a potassium source such as muriate of potash or wood ash (in moderation) and keep soil moisture even."; }

    @Override
    public String getPrevention() { return "Test soil periodically, avoid over-watering that leaches nutrients and mulch to retain soil quality."; }

    @Override
    public String getSymptomInfo() { return "Potassium shortage often causes brown, scorched leaf edges and curling."; }
}