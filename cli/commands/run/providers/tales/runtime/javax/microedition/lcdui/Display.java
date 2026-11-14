package javax.microedition.lcdui;

public class Display {
	private static Display instance;
	private static Displayable current;

	public static Display getDisplay(javax.microedition.midlet.MIDlet midlet) {
		if (instance == null) {
			instance = new Display();
		}
		return instance;
	}

	public void setCurrent(Displayable next) {
		if (current instanceof Canvas && current != next) {
			((Canvas) current).hideNotify();
		}
		current = next;
		if (next instanceof Canvas) {
			javatales.rt.Screen.show((Canvas) next);
			((Canvas) next).showNotify();
		}
	}

	public Displayable getCurrent() {
		return current;
	}
}
