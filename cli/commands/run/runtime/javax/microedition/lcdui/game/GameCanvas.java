package javax.microedition.lcdui.game;

import javax.microedition.lcdui.Canvas;
import javax.microedition.lcdui.Graphics;
import javatales.rt.Screen;

public class GameCanvas extends Canvas {
	public GameCanvas(boolean suppressKeyEvents) {}

	public Graphics getGraphics() {
		return Screen.bufferGraphics();
	}

	public void flushGraphics() {
		Screen.flush();
	}
}
