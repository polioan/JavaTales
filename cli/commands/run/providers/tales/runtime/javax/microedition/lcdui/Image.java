package javax.microedition.lcdui;

import java.io.IOException;
import org.teavm.jso.dom.html.HTMLCanvasElement;
import javatales.rt.Bridge;

public class Image {
	final HTMLCanvasElement canvas;
	final int width;
	final int height;
	private final boolean mutable;
	private Graphics graphics;

	Image(HTMLCanvasElement canvas, boolean mutable) {
		this.canvas = canvas;
		this.width = canvas.getWidth();
		this.height = canvas.getHeight();
		this.mutable = mutable;
	}

	public static Image createImage(int width, int height) {
		if (width <= 0 || height <= 0) {
			throw new IllegalArgumentException("size");
		}
		return new Image(Bridge.blankCanvas(width, height), true);
	}

	public static Image createImage(Image source) {
		HTMLCanvasElement copy = Bridge.blankCanvas(source.width, source.height);
		Bridge.context(copy).drawImage(source.canvas, 0, 0);
		return new Image(copy, false);
	}

	public static Image createImage(String name) throws IOException {
		HTMLCanvasElement decoded = Bridge.imageByPath(name);
		if (decoded == null) {
			throw new IOException(name);
		}
		return new Image(decoded, false);
	}

	public static Image createImage(byte[] data, int offset, int length) throws IOException {
		if (offset != 0 || length != data.length) {
			byte[] slice = new byte[length];
			System.arraycopy(data, offset, slice, 0, length);
			data = slice;
		}
		HTMLCanvasElement decoded = Bridge.imageByBytes(data);
		if (decoded == null) {
			throw new IOException("image");
		}
		return new Image(decoded, false);
	}

	public static Image createRGBImage(int[] rgb, int width, int height, boolean processAlpha) {
		HTMLCanvasElement canvas = Bridge.blankCanvas(width, height);
		Graphics graphics = new Graphics(Bridge.context(canvas), width, height);
		graphics.drawRGB(rgb, 0, width, 0, 0, width, height, processAlpha);
		return new Image(canvas, false);
	}

	public int getWidth() {
		return width;
	}

	public int getHeight() {
		return height;
	}

	public boolean isMutable() {
		return mutable;
	}

	public Graphics getGraphics() {
		if (!mutable) {
			throw new IllegalStateException("immutable");
		}
		if (graphics == null) {
			graphics = new Graphics(Bridge.context(canvas), width, height);
		}
		return graphics;
	}

	public void getRGB(int[] rgb, int offset, int scanlength, int x, int y, int width, int height) {
		Graphics.readRGB(Bridge.context(canvas), rgb, offset, scanlength, x, y, width, height);
	}
}
