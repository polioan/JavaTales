package javax.microedition.lcdui;

import java.util.ArrayList;

public abstract class Displayable {
	String title;
	Ticker ticker;
	CommandListener listener;
	final ArrayList<Command> commands = new ArrayList<Command>();

	public void addCommand(Command command) {
		if (command == null) {
			throw new NullPointerException("command");
		}
		if (!commands.contains(command)) {
			commands.add(command);
		}
		Display.repaint(this);
	}

	public void removeCommand(Command command) {
		if (command == null) {
			throw new NullPointerException("command");
		}
		commands.remove(command);
		Display.repaint(this);
	}

	public void setCommandListener(CommandListener listener) {
		this.listener = listener;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
		Display.repaint(this);
	}

	public Ticker getTicker() {
		return ticker;
	}

	public void setTicker(Ticker ticker) {
		this.ticker = ticker;
		Display.repaint(this);
	}

	public int getWidth() {
		return javatales.rt.Screen.WIDTH;
	}

	public int getHeight() {
		return javatales.rt.Screen.HEIGHT;
	}

	public boolean isShown() {
		return Display.shown() == this;
	}

	protected void sizeChanged(int width, int height) {}

	void attach(boolean shown) {}
}
