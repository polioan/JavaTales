package javatales.rt;

import javax.microedition.lcdui.Canvas;
import javax.microedition.lcdui.Graphics;
import org.teavm.jso.canvas.CanvasRenderingContext2D;
import org.teavm.jso.dom.html.HTMLCanvasElement;

public final class Screen {
	public static final int WIDTH = 240;
	public static final int HEIGHT = 320;

	private static Canvas current;
	private static javax.microedition.lcdui.Displayable page;
	private static HTMLCanvasElement buffer;
	private static Graphics bufferGraphics;
	private static CanvasRenderingContext2D visible;

	private Screen() {}

	public static void boot(javax.microedition.midlet.MIDlet midlet) {
		HTMLCanvasElement screen = Bridge.screen();
		screen.setWidth(WIDTH);
		screen.setHeight(HEIGHT);
		visible = Bridge.context(screen);
		Bridge.crisp(visible);
		buffer = Bridge.blankCanvas(WIDTH, HEIGHT);
		bufferGraphics = new Graphics(Bridge.context(buffer), WIDTH, HEIGHT);
		Bridge.installKeys();
		midlet.launch();
	}

	public static void show(Canvas canvas) {
		current = canvas;
		page = null;
	}

	public static void showPage(javax.microedition.lcdui.Displayable displayable) {
		current = null;
		page = displayable;
	}

	public static void dismiss() {
		current = null;
		page = null;
		javax.microedition.lcdui.Display.cleared();
		if (bufferGraphics != null) {
			bufferGraphics.setClip(0, 0, WIDTH, HEIGHT);
			bufferGraphics.setColor(0x000000);
			bufferGraphics.fillRect(0, 0, WIDTH, HEIGHT);
			flush();
		}
	}

	public static void key(int code, boolean down) {
		if (current != null) {
			current.dispatchKey(code, down);
		} else if (page != null) {
			javax.microedition.lcdui.Display.dispatchKey(code, down);
		}
	}

	public static Graphics bufferGraphics() {
		return bufferGraphics;
	}

	public static CanvasRenderingContext2D bufferContext() {
		return Bridge.context(buffer);
	}

	public static void flush() {
		visible.drawImage(buffer, 0, 0);
	}
}
