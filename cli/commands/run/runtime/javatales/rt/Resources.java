package javatales.rt;

import java.io.InputStream;

public final class Resources {
	private Resources() {}

	public static InputStream open(String name) {
		return Bridge.open(name);
	}
}
