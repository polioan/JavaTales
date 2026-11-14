package javax.microedition.lcdui;

public class Ticker {
	private String text;

	public Ticker(String text) {
		setString(text);
	}

	public String getString() {
		return text;
	}

	public void setString(String text) {
		if (text == null) {
			throw new NullPointerException("ticker");
		}
		this.text = text;
	}
}
