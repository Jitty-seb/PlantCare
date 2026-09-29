package plantcare;

import java.util.ArrayList;
import java.util.List;

/** Stores the predefined experts in an ArrayList and searches them. */
public class ExpertManager {
    private ArrayList<Expert> experts = new ArrayList<>();

    public ExpertManager() {
        experts.add(new Expert(1, "Dr. Anu Thomas", "Plant Nutrition Specialist", 8, "Kerala",
            "Helps farmers correct nutrient imbalances in vegetable and banana crops.",
            new ArrayList<>(List.of("Nitrogen", "Iron", "Magnesium"))));
        experts.add(new Expert(2, "Rajesh Menon", "Soil Health Consultant", 12, "Thrissur, Kerala",
            "Specialises in soil testing, fertilizer planning and improving soil fertility.",
            new ArrayList<>(List.of("Nitrogen", "Potassium"))));
        experts.add(new Expert(3, "Dr. Meera Nair", "Plant Nutrition Specialist", 10, "Kochi, Kerala",
            "Works on micronutrient problems such as iron and magnesium shortage.",
            new ArrayList<>(List.of("Iron", "Magnesium"))));
        experts.add(new Expert(4, "Suresh Kumar", "Horticulture Advisor", 6, "Palakkad, Kerala",
            "Guides small growers on tomato, chilli and potato crop care.",
            new ArrayList<>(List.of("Potassium", "Magnesium", "Nitrogen"))));
        experts.add(new Expert(5, "Fathima Beevi", "Organic Farming Advisor", 9, "Wayanad, Kerala",
            "Promotes compost and organic nutrient management for healthier plants.",
            new ArrayList<>(List.of("Nitrogen", "Potassium", "Iron"))));
    }

    /** Returns experts as a JSON array. If key is empty, returns everyone. */
    public String listJson(String key) {
        ArrayList<String> out = new ArrayList<>();
        for (Expert e : experts) {
            if (key == null || key.isEmpty() || e.handles(key)) out.add(e.toJson());
        }
        return "[" + String.join(",", out) + "]";
    }

    public Expert findById(int id) {
        for (Expert e : experts) {
            if (e.getId() == id) return e;
        }
        return null;
    }
}
