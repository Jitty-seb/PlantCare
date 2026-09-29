package plantcare;

/** Iron deficiency: extends Deficiency and overrides its methods. */
public class IronDeficiency extends Deficiency {

    public IronDeficiency() { super("Iron", "Iron Deficiency"); }

    @Override
    public int scoreFor(String symptom) {
        switch (symptom) {
            case "pale_new_leaves": return 2;
            case "interveinal_yellowing": return 1;
            default: return 0;
        }
    }

    @Override
    public String getTreatment() { return "Apply chelated iron or an iron sulfate spray and check that soil pH is not too high."; }

    @Override
    public String getPrevention() { return "Keep soil pH suitable for the crop, ensure good drainage and add organic compost."; }

    @Override
    public String getSymptomInfo() { return "Iron shortage shows first on the young, new leaves, which turn pale or yellow."; }
}
