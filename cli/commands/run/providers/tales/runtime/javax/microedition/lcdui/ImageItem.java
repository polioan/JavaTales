package javax.microedition.lcdui;

public class ImageItem extends Item {
	public static final int LAYOUT_DEFAULT = 0;
	public static final int LAYOUT_LEFT = 1;
	public static final int LAYOUT_RIGHT = 2;
	public static final int LAYOUT_CENTER = 3;
	public static final int LAYOUT_NEWLINE_BEFORE = 0x100;
	public static final int LAYOUT_NEWLINE_AFTER = 0x200;

	private Image image;
	private String altText;
	private final int appearance;

	public ImageItem(String label, Image image, int layout, String altText) {
		this(label, image, layout, altText, PLAIN);
	}

	public ImageItem(String label, Image image, int layout, String altText, int appearanceMode) {
		super(label);
		if (appearanceMode != PLAIN && appearanceMode != HYPERLINK && appearanceMode != BUTTON) {
			throw new IllegalArgumentException("appearance");
		}
		this.image = image;
		this.altText = altText;
		this.appearance = appearanceMode;
		setLayout(layout);
	}

	public Image getImage() {
		return image;
	}

	public void setImage(Image image) {
		this.image = image;
		changed();
	}

	public String getAltText() {
		return altText;
	}

	public void setAltText(String altText) {
		this.altText = altText;
		changed();
	}

	public int getAppearanceMode() {
		return appearance;
	}
}
