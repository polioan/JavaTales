package javax.microedition.lcdui;

import com.nokia.mid.ui.DirectGraphics;
import org.teavm.jso.JSBody;
import org.teavm.jso.canvas.CanvasRenderingContext2D;
import org.teavm.jso.dom.html.HTMLCanvasElement;
import org.teavm.jso.typedarrays.Int32Array;
import javax.microedition.lcdui.game.Sprite;

public class Graphics implements DirectGraphics {
	public static final int HCENTER = 1;
	public static final int VCENTER = 2;
	public static final int LEFT = 4;
	public static final int RIGHT = 8;
	public static final int TOP = 16;
	public static final int BOTTOM = 32;
	public static final int BASELINE = 64;
	public static final int SOLID = 0;
	public static final int DOTTED = 1;

	private final CanvasRenderingContext2D context;
	private final int width;
	private final int height;
	private int color = 0x000000;
	private int clipX;
	private int clipY;
	private int clipWidth;
	private int clipHeight;
	private boolean clipped;
	private int originX;
	private int originY;
	private int stroke = SOLID;
	private Font font = Font.getDefaultFont();

	public Graphics(CanvasRenderingContext2D context, int width, int height) {
		this.context = context;
		this.width = width;
		this.height = height;
		javatales.rt.Bridge.crisp(context);
		setClip(0, 0, width, height);
	}

	static CanvasRenderingContext2D measureContext() {
		return javatales.rt.Screen.bufferContext();
	}

	public void setColor(int rgb) {
		color = rgb & 0xFFFFFF;
		css(context, color, true);
	}

	public void setFont(Font font) {
		if (font != null) {
			this.font = font;
		}
	}

	public Font getFont() {
		return font;
	}

	public void setClip(int x, int y, int width, int height) {
		clipX = x;
		clipY = y;
		clipWidth = width;
		clipHeight = height;
		if (clipped) {
			context.restore();
		}
		context.save();
		clipped = true;
		context.beginPath();
		context.rect(x + originX, y + originY, width, height);
		context.clip();
		css(context, color, true);
		javatales.rt.Bridge.crisp(context);
	}

	public void clipRect(int x, int y, int width, int height) {
		int left = Math.max(clipX, x);
		int top = Math.max(clipY, y);
		int right = Math.min(clipX + clipWidth, x + width);
		int bottom = Math.min(clipY + clipHeight, y + height);
		setClip(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
	}

	public void translate(int x, int y) {
		originX += x;
		originY += y;
	}

	public int getTranslateX() {
		return originX;
	}

	public int getTranslateY() {
		return originY;
	}

	public void setStrokeStyle(int style) {
		if (style != SOLID && style != DOTTED) {
			throw new IllegalArgumentException("stroke");
		}
		stroke = style;
	}

	public int getStrokeStyle() {
		return stroke;
	}

	public int getClipX() {
		return clipX;
	}

	public int getClipY() {
		return clipY;
	}

	public int getClipWidth() {
		return clipWidth;
	}

	public int getClipHeight() {
		return clipHeight;
	}

	public void fillRect(int x, int y, int width, int height) {
		if (width > 0 && height > 0) {
			context.fillRect(x + originX, y + originY, width, height);
		}
	}

	public void drawRect(int x, int y, int width, int height) {
		if (width < 0 || height < 0) {
			return;
		}
		css(context, color, false);
		context.setLineWidth(1);
		context.strokeRect(x + originX, y + originY, width, height);
	}

	public void drawLine(int x1, int y1, int x2, int y2) {
		css(context, color, false);
		context.setLineWidth(1);
		context.beginPath();
		context.moveTo(x1 + originX, y1 + originY);
		context.lineTo(x2 + originX, y2 + originY);
		context.stroke();
	}

	public void fillArc(int x, int y, int width, int height, int startAngle, int arcAngle) {
		if (width <= 0 || height <= 0 || arcAngle == 0) {
			return;
		}
		paintArc(context, x + originX, y + originY, width, height, startAngle, arcAngle);
	}

	public void drawArc(int x, int y, int width, int height, int startAngle, int arcAngle) {
		if (width < 0 || height < 0 || arcAngle == 0) {
			return;
		}
		css(context, color, false);
		context.setLineWidth(1);
		strokeArc(context, x + originX, y + originY, width, height, startAngle, arcAngle);
	}

	public void fillTriangle(int x1, int y1, int x2, int y2, int x3, int y3) {
		double cx = (x1 + x2 + x3) / 3.0;
		double cy = (y1 + y2 + y3) / 3.0;
		context.beginPath();
		context.moveTo(cover(x1, cx) + originX, cover(y1, cy) + originY);
		context.lineTo(cover(x2, cx) + originX, cover(y2, cy) + originY);
		context.lineTo(cover(x3, cx) + originX, cover(y3, cy) + originY);
		context.closePath();
		context.fill();
		css(context, color, false);
		context.setLineWidth(1);
		context.stroke();
	}

	public void fillPolygon(int[] xPoints, int xOffset, int[] yPoints, int yOffset, int nPoints, int argbColor) {
		if (nPoints <= 0) {
			return;
		}
		if (originX != 0 || originY != 0) {
			int[] shiftedX = new int[nPoints];
			int[] shiftedY = new int[nPoints];
			for (int index = 0; index < nPoints; index++) {
				shiftedX[index] = xPoints[xOffset + index] + originX;
				shiftedY[index] = yPoints[yOffset + index] + originY;
			}
			xPoints = shiftedX;
			yPoints = shiftedY;
			xOffset = 0;
			yOffset = 0;
		}
		context.beginPath();
		context.moveTo(xPoints[xOffset], yPoints[yOffset]);
		for (int index = 1; index < nPoints; index++) {
			context.lineTo(xPoints[xOffset + index], yPoints[yOffset + index]);
		}
		context.closePath();
		context.setGlobalAlpha(((argbColor >>> 24) & 255) / 255.0);
		css(context, argbColor, true);
		context.fill();
		css(context, argbColor, false);
		context.setLineWidth(1);
		context.stroke();
		context.setGlobalAlpha(1);
		css(context, color, true);
	}

	public void drawString(String text, int x, int y, int anchor) {
		drawSubstring(text, 0, text.length(), x, y, anchor);
	}

	public void drawSubstring(String text, int offset, int length, int x, int y, int anchor) {
		String slice = text.substring(offset, offset + length);
		int textWidth = font.substringWidth(slice, 0, slice.length());
		int dx = x;
		int dy = y;
		if ((anchor & RIGHT) != 0) {
			dx -= textWidth;
		} else if ((anchor & HCENTER) != 0) {
			dx -= textWidth / 2;
		}
		if ((anchor & BOTTOM) != 0) {
			dy -= font.height;
		} else if ((anchor & VCENTER) != 0) {
			dy -= font.height / 2;
		} else if ((anchor & BASELINE) != 0) {
			dy -= font.height - 3;
		}
		fillText(context, font.css, slice, dx + originX, dy + originY);
	}

	public void drawChar(char character, int x, int y, int anchor) {
		drawString(String.valueOf(character), x, y, anchor);
	}

	public void drawChars(char[] data, int offset, int length, int x, int y, int anchor) {
		drawString(new String(data, offset, length), x, y, anchor);
	}

	public void drawImage(Image image, int x, int y, int anchor) {
		if (image == null) {
			throw new NullPointerException("image");
		}
		int horizontal = anchor & (LEFT | RIGHT | HCENTER);
		int vertical = anchor & (TOP | BOTTOM | VCENTER);
		if (horizontal == 0 || vertical == 0 || (horizontal != LEFT && horizontal != RIGHT && horizontal != HCENTER)
			|| (vertical != TOP && vertical != BOTTOM && vertical != VCENTER)) {
			throw new IllegalArgumentException("anchor");
		}
		int dx = x + originX;
		int dy = y + originY;
		if (horizontal == RIGHT) {
			dx -= image.width;
		} else if (horizontal == HCENTER) {
			dx -= image.width / 2;
		}
		if (vertical == BOTTOM) {
			dy -= image.height;
		} else if (vertical == VCENTER) {
			dy -= image.height / 2;
		}
		context.drawImage(image.canvas, 0, 0, image.width, image.height, dx, dy, image.width, image.height);
	}

	public void drawRegion(Image source, int xSrc, int ySrc, int width, int height, int transform, int xDest, int yDest, int anchor) {
		if (width <= 0 || height <= 0) {
			return;
		}
		boolean quarter = transform == Sprite.TRANS_ROT90 || transform == Sprite.TRANS_ROT270
			|| transform == Sprite.TRANS_MIRROR_ROT90 || transform == Sprite.TRANS_MIRROR_ROT270;
		int destWidth = quarter ? height : width;
		int destHeight = quarter ? width : height;
		int dx = xDest + originX;
		int dy = yDest + originY;
		if ((anchor & RIGHT) != 0) {
			dx -= destWidth;
		} else if ((anchor & HCENTER) != 0) {
			dx -= destWidth / 2;
		}
		if ((anchor & BOTTOM) != 0) {
			dy -= destHeight;
		} else if ((anchor & VCENTER) != 0) {
			dy -= destHeight / 2;
		}
		context.save();
		switch (transform) {
			case Sprite.TRANS_MIRROR:
				context.translate(dx + width, dy);
				context.scale(-1, 1);
				break;
			case Sprite.TRANS_ROT180:
				context.translate(dx + width, dy + height);
				context.rotate(Math.PI);
				break;
			case Sprite.TRANS_MIRROR_ROT180:
				context.translate(dx, dy + height);
				context.scale(1, -1);
				break;
			case Sprite.TRANS_ROT90:
				context.translate(dx + height, dy);
				context.rotate(Math.PI / 2);
				break;
			case Sprite.TRANS_ROT270:
				context.translate(dx, dy + width);
				context.rotate(-Math.PI / 2);
				break;
			case Sprite.TRANS_MIRROR_ROT90:
				context.translate(dx + height, dy + width);
				context.rotate(Math.PI / 2);
				context.scale(-1, 1);
				break;
			case Sprite.TRANS_MIRROR_ROT270:
				context.translate(dx, dy);
				context.rotate(-Math.PI / 2);
				context.scale(-1, 1);
				break;
			default:
				context.translate(dx, dy);
				break;
		}
		context.drawImage(source.canvas, xSrc, ySrc, width, height, 0, 0, width, height);
		context.restore();
	}

	public void drawRGB(int[] rgb, int offset, int scanlength, int x, int y, int width, int height, boolean processAlpha) {
		if (width <= 0 || height <= 0) {
			return;
		}
		paintRGB(context, rgb, offset, scanlength, x + originX, y + originY, width, height, processAlpha);
	}

	static void readRGB(CanvasRenderingContext2D context, int[] rgb, int offset, int scanlength, int x, int y, int width, int height) {
		Int32Array raw = readPixels(context, x, y, width, height);
		for (int row = 0; row < height; row++) {
			int cursor = offset + row * scanlength;
			int start = row * width;
			for (int column = 0; column < width; column++) {
				rgb[cursor++] = raw.get(start + column);
			}
		}
	}

	static double measure(CanvasRenderingContext2D context, String font, String text) {
		return measureText(context, font, text);
	}

	private static double cover(int value, double center) {
		double delta = value - center;
		if (delta > 0) {
			return value + 0.75;
		}
		if (delta < 0) {
			return value - 0.75;
		}
		return value;
	}

	@JSBody(params = {"context", "rgb", "fill"}, script = "var style = 'rgb(' + ((rgb >> 16) & 255) + ',' + ((rgb >> 8) & 255) + ',' + (rgb & 255) + ')'; if (fill) context.fillStyle = style; else context.strokeStyle = style;")
	private static native void css(CanvasRenderingContext2D context, int rgb, boolean fill);

	@JSBody(params = {"context", "font", "text"}, script = "var previous = context.font; context.font = font; var width = context.measureText(text).width; context.font = previous; return width;")
	private static native double measureText(CanvasRenderingContext2D context, String font, String text);

	@JSBody(params = {"context", "font", "text", "x", "y"}, script = "var previous = context.font; context.font = font; context.textAlign = 'left'; context.textBaseline = 'top'; context.fillText(text, x, y); context.font = previous;")
	private static native void fillText(CanvasRenderingContext2D context, String font, String text, int x, int y);

	@JSBody(params = {"context", "x", "y", "width", "height", "startAngle", "arcAngle"}, script = """
		var sweep = arcAngle;
		while (sweep > 360) sweep -= 360;
		while (sweep < -360) sweep += 360;
		var cx = x + width / 2;
		var cy = y + height / 2;
		var rx = width / 2;
		var ry = height / 2;
		context.beginPath();
		if (sweep >= 360 || sweep <= -360) {
			context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
		} else {
			var start = -startAngle * Math.PI / 180;
			var end = -(startAngle + sweep) * Math.PI / 180;
			context.moveTo(cx, cy);
			context.ellipse(cx, cy, rx, ry, 0, start, end, sweep > 0);
			context.closePath();
		}
		context.fill();
		""")
	private static native void paintArc(CanvasRenderingContext2D context, int x, int y, int width, int height, int startAngle, int arcAngle);

	@JSBody(params = {"context", "x", "y", "width", "height", "startAngle", "arcAngle"}, script = """
		var sweep = arcAngle;
		while (sweep > 360) sweep -= 360;
		while (sweep < -360) sweep += 360;
		var cx = x + width / 2;
		var cy = y + height / 2;
		var rx = width / 2;
		var ry = height / 2;
		context.beginPath();
		if (sweep >= 360 || sweep <= -360) {
			context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
		} else {
			var start = -startAngle * Math.PI / 180;
			var end = -(startAngle + sweep) * Math.PI / 180;
			context.ellipse(cx, cy, rx, ry, 0, start, end, sweep > 0);
		}
		context.stroke();
		""")
	private static native void strokeArc(CanvasRenderingContext2D context, int x, int y, int width, int height, int startAngle, int arcAngle);

	@JSBody(params = {"context", "rgb", "offset", "scan", "x", "y", "width", "height", "processAlpha"}, script = "var temp = document.createElement('canvas'); temp.width = width; temp.height = height; var pixels = temp.getContext('2d').createImageData(width, height); var data = pixels.data; var out = 0; for (var row = 0; row < height; row++) { var cursor = offset + row * scan; for (var column = 0; column < width; column++) { var color = rgb[cursor++]; data[out++] = (color >> 16) & 255; data[out++] = (color >> 8) & 255; data[out++] = color & 255; data[out++] = processAlpha ? ((color >>> 24) & 255) : 255; } } temp.getContext('2d').putImageData(pixels, 0, 0); context.drawImage(temp, x, y);")
	private static native void paintRGB(CanvasRenderingContext2D context, int[] rgb, int offset, int scan, int x, int y, int width, int height, boolean processAlpha);

	@JSBody(params = {"context", "x", "y", "width", "height"}, script = "var pixels = context.getImageData(x, y, width, height).data; var out = new Int32Array(width * height); var incoming = 0; for (var index = 0; index < out.length; index++) { var red = pixels[incoming++] & 255; var green = pixels[incoming++] & 255; var blue = pixels[incoming++] & 255; var alpha = pixels[incoming++] & 255; out[index] = (alpha << 24) | (red << 16) | (green << 8) | blue; } return out;")
	private static native Int32Array readPixels(CanvasRenderingContext2D context, int x, int y, int width, int height);
}
