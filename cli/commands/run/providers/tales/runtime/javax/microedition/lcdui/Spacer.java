package javax.microedition.lcdui;

public class Spacer extends Item {
	private int minimumWidth;
	private int minimumHeight;

	public Spacer(int minWidth, int minHeight) {
		super(null);
		setMinimumSize(minWidth, minHeight);
	}

	public void setMinimumSize(int minWidth, int minHeight) {
		if (minWidth < 0 || minHeight < 0) {
			throw new IllegalArgumentException("size");
		}
		minimumWidth = minWidth;
		minimumHeight = minHeight;
		changed();
	}

	public int getMinimumWidth() {
		return minimumWidth;
	}

	public int getMinimumHeight() {
		return minimumHeight;
	}

	public void setLabel(String label) {
		throw new IllegalStateException("spacer");
	}

	public void addCommand(Command command) {
		throw new IllegalStateException("spacer");
	}

	public void setDefaultCommand(Command command) {
		throw new IllegalStateException("spacer");
	}
}
