package plantcare;

import java.io.IOException;

/** Entry point: starts the web server. */
public class Main {
    public static void main(String[] args) {
        try {
            new WebServer().start(8080);
        } catch (IOException e) {
            System.out.println("Could not start server (is port 8080 already in use?): " + e.getMessage());
        }
    }
}
