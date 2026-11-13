package javax.microedition.lcdui;

import javatales.rt.Screen;

public abstract class Canvas extends Displayable {
	public static final int UP = 1;
	public static final int LEFT = 2;
	public static final int RIGHT = 5;
	public static final int DOWN = 6;
	public static final int FIRE = 8;
	public static final int GAME_A = 9;
	public static final int GAME_B = 10;
	public static final int GAME_C = 11;
	public static final int GAME_D = 12;

	public static final int KEY_NUM0 = 48;
	public static final int KEY_NUM1 = 49;
	public static final int KEY_NUM2 = 50;
	public static final int KEY_NUM3 = 51;
	public static final int KEY_NUM4 = 52;
	public static final int KEY_NUM5 = 53;
	public static final int KEY_NUM6 = 54;
	public static final int KEY_NUM7 = 55;
	public static final int KEY_NUM8 = 56;
	public static final int KEY_NUM9 = 57;
	public static final int KEY_STAR = 42;
	public static final int KEY_POUND = 35;

	public int getWidth() {
		return Screen.WIDTH;
	}

	public int getHeight() {
		return Screen.HEIGHT;
	}

	public void setFullScreenMode(boolean mode) {}

	public int getGameAction(int keyCode) {
		switch (keyCode) {
			case -1:
			case KEY_NUM2:
				return UP;
			case -2:
			case KEY_NUM8:
				return DOWN;
			case -3:
			case KEY_NUM4:
				return LEFT;
			case -4:
			case KEY_NUM6:
				return RIGHT;
			case -5:
			case KEY_NUM5:
				return FIRE;
			default:
				throw new IllegalArgumentException("key " + keyCode);
		}
	}

	public final void dispatchKey(int keyCode, boolean down) {
		if (down) {
			keyPressed(keyCode);
		} else {
			keyReleased(keyCode);
		}
	}

	protected void keyPressed(int keyCode) {}

	protected void keyReleased(int keyCode) {}

	protected void keyRepeated(int keyCode) {}

	protected void showNotify() {}

	protected void hideNotify() {}

	protected void paint(Graphics graphics) {}
}
