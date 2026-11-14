package javatales.rt;

public final class Props {
	private Props() {}

	public static String get(String key) {
		if ("microedition.platform".equals(key)) {
			return "Nokia";
		}
		if ("microedition.locale".equals(key)) {
			return "en-US";
		}
		if ("microedition.configuration".equals(key)) {
			return "CLDC-1.1";
		}
		if ("microedition.profiles".equals(key)) {
			return "MIDP-2.0";
		}
		return null;
	}
}
