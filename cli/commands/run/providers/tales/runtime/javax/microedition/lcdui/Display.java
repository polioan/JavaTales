package javax.microedition.lcdui;

public class Display {
	public static final int LIST_ELEMENT = 1;
	public static final int CHOICE_GROUP_ELEMENT = 2;
	public static final int ALERT = 3;
	public static final int COLOR_BACKGROUND = 0;
	public static final int COLOR_FOREGROUND = 1;
	public static final int COLOR_HIGHLIGHTED_BACKGROUND = 2;
	public static final int COLOR_HIGHLIGHTED_FOREGROUND = 3;
	public static final int COLOR_BORDER = 4;
	public static final int COLOR_HIGHLIGHTED_BORDER = 5;

	private static Display instance;
	private static Displayable current;

	public static Display getDisplay(javax.microedition.midlet.MIDlet midlet) {
		if (instance == null) {
			instance = new Display();
		}
		return instance;
	}

	public static void dispatchKey(int code, boolean down) {
		Displayable displayable = current;
		if (displayable != null && !(displayable instanceof Canvas)) {
			Shell.key(displayable, code, down);
		}
	}

	static Displayable shown() {
		return current;
	}

	public static void cleared() {
		current = null;
	}

	static void repaint(Displayable displayable) {
		if (displayable != null && displayable == current && !(displayable instanceof Canvas)) {
			Shell.paint(displayable);
		}
	}

	public Displayable getCurrent() {
		return current;
	}

	public void setCurrent(Displayable next) {
		if (next == null) {
			throw new NullPointerException("displayable");
		}
		Displayable previous = current;
		if (previous instanceof Canvas && previous != next) {
			((Canvas) previous).hideNotify();
		}
		if (previous != null && previous != next && !(previous instanceof Canvas)) {
			previous.attach(false);
		}
		current = next;
		if (next instanceof Canvas) {
			javatales.rt.Screen.show((Canvas) next);
			if (previous != next) {
				((Canvas) next).showNotify();
			}
			return;
		}
		if (next instanceof Alert) {
			Alert alert = (Alert) next;
			if (alert.returnTo == null && previous != null && previous != next && !(previous instanceof Alert)) {
				alert.returnTo = previous;
			}
		}
		javatales.rt.Screen.showPage(next);
		if (previous != next) {
			next.attach(true);
		}
		Shell.paint(next);
		if (next instanceof Alert) {
			schedule((Alert) next);
		}
	}

	public void setCurrent(Alert alert, Displayable next) {
		if (alert == null || next == null) {
			throw new NullPointerException("displayable");
		}
		if (next instanceof Alert) {
			throw new IllegalArgumentException("alert");
		}
		alert.returnTo = next;
		setCurrent(alert);
	}

	public void setCurrentItem(Item item) {
		if (item == null) {
			throw new NullPointerException("item");
		}
		Form form = item.owner;
		if (form == null) {
			throw new IllegalStateException("owner");
		}
		form.focus(item);
		setCurrent(form);
	}

	public void callSerially(final Runnable runnable) {
		if (runnable == null) {
			throw new NullPointerException("runnable");
		}
		new Thread(new Runnable() {
			public void run() {
				runnable.run();
			}
		}).start();
	}

	public boolean flashBacklight(int duration) {
		return false;
	}

	public boolean vibrate(int duration) {
		if (duration < 0) {
			throw new IllegalArgumentException("duration");
		}
		return false;
	}

	public boolean isColor() {
		return true;
	}

	public int numColors() {
		return 16777216;
	}

	public int numAlphaLevels() {
		return 256;
	}

	public int getColor(int colorSpecifier) {
		switch (colorSpecifier) {
			case COLOR_BACKGROUND:
				return 0xFFFFFF;
			case COLOR_FOREGROUND:
				return 0x000000;
			case COLOR_HIGHLIGHTED_BACKGROUND:
				return 0x0A3A66;
			case COLOR_HIGHLIGHTED_FOREGROUND:
				return 0xFFFFFF;
			case COLOR_BORDER:
			case COLOR_HIGHLIGHTED_BORDER:
				return 0x666666;
			default:
				throw new IllegalArgumentException("color");
		}
	}

	public int getBorderStyle(boolean highlighted) {
		return highlighted ? Graphics.DOTTED : Graphics.SOLID;
	}

	public int getBestImageWidth(int imageType) {
		return 16;
	}

	public int getBestImageHeight(int imageType) {
		return 16;
	}

	private void schedule(final Alert alert) {
		final int timeout = alert.getTimeout();
		if (timeout < 0) {
			return;
		}
		final Displayable returnTo = alert.returnTo;
		new Thread(new Runnable() {
			public void run() {
				try {
					Thread.sleep(timeout);
				} catch (InterruptedException ignored) {
				}
				if (shown() == alert && returnTo != null) {
					setCurrent(returnTo);
				}
			}
		}).start();
	}
}
