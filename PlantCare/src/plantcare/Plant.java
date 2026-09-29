package plantcare;

/** A plant chosen by the user. Shows encapsulation: private field + constructor + getter. */
public class Plant {
    private String name;

    public Plant(String name) { this.name = name; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
