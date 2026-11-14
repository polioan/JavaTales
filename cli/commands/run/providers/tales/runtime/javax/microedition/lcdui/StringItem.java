package javax.microedition.lcdui;

public class StringItem extends Item {
	private String text;
	private final int appearance;
	private Font font;

	public StringItem(String label, String text) {
		this(label, text, PLAIN);
	}

	public StringItem(String label, String text, int appearanceMode) {
		super(label);
		if (appearanceMode != PLAIN && appearanceMode != HYPERLINK && appearanceMode != BUTTON) {
			throw new IllegalArgumentException("appearance");
		}
		this.text = text;
		this.appearance = appearanceMode;
	}

	public String getText() {
		return text;
	}

	public void setText(String text) {
		this.text = text;
		changed();
	}

	public int getAppearanceMode() {
		return appearance;
	}

	public Font getFont() {
		return font;
	}

	public void setFont(Font font) {
		this.font = font;
		changed();
	}
}
