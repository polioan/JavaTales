package javax.microedition.media;

import java.io.IOException;
import java.io.InputStream;

public class Manager {
	public static Player createPlayer(InputStream stream, String type) throws IOException, MediaException {
		return Player.open(stream, type);
	}
}
