package plantcare;

/** Nitrogen deficiency: extends Deficiency and overrides its methods. */
public class NitrogenDeficiency extends Deficiency {

    public NitrogenDeficiency() { super("Nitrogen", "Nitrogen Deficiency"); }

    @Override
    public int scoreFor(String symptom) {
        switch (symptom) {
            case "yellow_leaves": return 2;
            case "slow_growth": return 2;
            case "leaf_drop": return 1;
            default: return 0;
        }
    }

    @Override
    public String getTreatment() { return "Apply a balanced nitrogen-rich fertilizer (for example urea or well-decomposed compost) in small doses and water well."; }

    @Override
    public String getPrevention() { return "Maintain balanced soil nutrition, add organic matter regularly and monitor plant growth."; }

    @Override
    public String getSymptomInfo() { return "Nitrogen shortage typically shows as yellowing of older leaves and slow growth."; }
}