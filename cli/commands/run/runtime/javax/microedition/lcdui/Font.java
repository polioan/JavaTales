package javax.microedition.lcdui;

import java.util.HashMap;
import org.teavm.jso.canvas.CanvasRenderingContext2D;

public class Font {
	public static final int FACE_SYSTEM = 0;
	public static final int FACE_MONOSPACE = 32;
	public static final int FACE_PROPORTIONAL = 64;
	public static final int STYLE_PLAIN = 0;
	public static final int STYLE_BOLD = 1;
	public static final int STYLE_ITALIC = 2;
	public static final int STYLE_UNDERLINED = 4;
	public static final int SIZE_MEDIUM = 0;
	public static final int SIZE_SMALL = 8;
	public static final int SIZE_LARGE = 16;

	private static final HashMap FONTS = new HashMap();

	final int face;
	final int style;
	final int size;
	final String css;
	final int height;

	private Font(int face, int style, int size) {
		this.face = face;
		this.style = style;
		this.size = size;
		int pixels = size == SIZE_SMALL ? 12 : size == SIZE_LARGE ? 20 : 16;
		this.height = pixels;
		String slant = (style & STYLE_ITALIC) != 0 ? "italic " : "";
		String weight = (style & STYLE_BOLD) != 0 ? "bold " : "";
		String family = face == FACE_MONOSPACE ? "monospace" : "sans-serif";
		this.css = slant + weight + pixels + "px " + family;
	}

	public static Font getFont(int face, int style, int size) {
		String key = face + "/" + style + "/" + size;
		Font font = (Font) FONTS.get(key);
		if (font == null) {
			font = new Font(face, style, size);
			FONTS.put(key, font);
		}
		return font;
	}

	public static Font getDefaultFont() {
		return getFont(FACE_PROPORTIONAL, STYLE_PLAIN, SIZE_MEDIUM);
	}

	public int getHeight() {
		return height;
	}

	public int stringWidth(String text) {
		return substringWidth(text, 0, text.length());
	}

	public int substringWidth(String text, int offset, int length) {
		return (int) Math.ceil(measure(Graphics.measureContext(), css, text.substring(offset, offset + length)));
	}

	public int charWidth(char character) {
		return stringWidth(String.valueOf(character));
	}

	private static double measure(CanvasRenderingContext2D context, String font, String text) {
		return Graphics.measure(context, font, text);
	}
}
