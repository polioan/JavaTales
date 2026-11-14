package javax.microedition.lcdui;

public abstract class CustomItem extends Item {
	public static final int NONE = 0;
	public static final int TRAVERSE_HORIZONTAL = 1;
	public static final int TRAVERSE_VERTICAL = 2;
	public static final int KEY_PRESS = 4;
	public static final int KEY_RELEASE = 8;
	public static final int KEY_REPEAT = 0x10;
	public static final int POINTER_PRESS = 0x20;
	public static final int POINTER_RELEASE = 0x40;
	public static final int POINTER_DRAG = 0x80;

	protected CustomItem(String label) {
		super(label);
	}

	public int getGameAction(int keyCode) {
		return Canvas.map(keyCode);
	}

	protected final int getInteractionModes() {
		return KEY_PRESS | KEY_RELEASE | TRAVERSE_HORIZONTAL | TRAVERSE_VERTICAL;
	}

	protected abstract int getMinContentWidth();

	protected abstract int getMinContentHeight();

	protected abstract int getPrefContentWidth(int height);

	protected abstract int getPrefContentHeight(int width);

	protected abstract void paint(Graphics graphics, int width, int height);

	protected final void repaint() {
		changed();
	}

	protected final void repaint(int x, int y, int width, int height) {
		changed();
	}

	protected final void invalidate() {
		changed();
	}

	protected void keyPressed(int keyCode) {}

	protected void keyReleased(int keyCode) {}

	protected void keyRepeated(int keyCode) {}

	protected void pointerPressed(int x, int y) {}

	protected void pointerReleased(int x, int y) {}

	protected void pointerDragged(int x, int y) {}

	protected void showNotify() {}

	protected void hideNotify() {}

	protected void sizeChanged(int width, int height) {}

	protected boolean traverse(int direction, int viewportWidth, int viewportHeight, int[] visRect) {
		return false;
	}

	protected void traverseOut() {}

	public int getMinimumWidth() {
		return getMinContentWidth();
	}

	public int getMinimumHeight() {
		return getMinContentHeight();
	}
}
