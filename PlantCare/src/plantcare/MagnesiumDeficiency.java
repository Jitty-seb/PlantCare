package plantcare;

/** Magnesium deficiency: extends Deficiency and overrides its methods. */
public class MagnesiumDeficiency extends Deficiency {

    public MagnesiumDeficiency() { super("Magnesium", "Magnesium Deficiency"); }

    @Override
    public int scoreFor(String symptom) {
        switch (symptom) {
            case "interveinal_yellowing": return 2;
            case "yellow_leaves": return 1;
            case "leaf_drop": return 1;
            default: return 0;
        }
    }

    @Override
    public String getTreatment() { return "Apply magnesium sulfate (Epsom salt) as a soil dressing or foliar spray as advised for the crop."; }

    @Override
    public String getPrevention() { return "Avoid excess potassium fertilizer, add compost and keep soil pH balanced."; }

    @Override
    public String getSymptomInfo() { return "Magnesium shortage usually causes yellowing between the veins of older leaves while veins stay green."; }
}