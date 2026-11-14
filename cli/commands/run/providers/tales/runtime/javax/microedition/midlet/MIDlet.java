package javax.microedition.midlet;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.HashMap;
import javax.microedition.io.ConnectionNotFoundException;
import javatales.rt.Resources;

public abstract class MIDlet {
	private static HashMap properties;

	public final void launch() {
		startApp();
	}

	protected abstract void startApp();

	protected abstract void pauseApp();

	protected abstract void destroyApp(boolean unconditional);

	public final void notifyDestroyed() {}

	public final void notifyPaused() {}

	public final boolean platformRequest(String url) throws ConnectionNotFoundException {
		return false;
	}

	public final String getAppProperty(String key) {
		if (properties == null) {
			properties = new HashMap();
			InputStream stream = Resources.open("/META-INF/MANIFEST.MF");
			if (stream != null) {
				try {
					BufferedReader reader = new BufferedReader(new InputStreamReader(stream, "ISO-8859-1"));
					String pending = null;
					String line;
					while ((line = reader.readLine()) != null) {
						if (line.startsWith(" ") && pending != null) {
							pending += line.substring(1);
							continue;
						}
						store(pending);
						pending = line;
					}
					store(pending);
				} catch (Exception ignored) {
				}
			}
		}
		return (String) properties.get(key);
	}

	private static void store(String line) {
		if (line == null) {
			return;
		}
		int split = line.indexOf(':');
		if (split <= 0) {
			return;
		}
		properties.put(line.substring(0, split).trim(), line.substring(split + 1).trim());
	}
}
