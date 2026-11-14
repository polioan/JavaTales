package javax.microedition.lcdui;

public class Alert extends Screen {
	public static final int FOREVER = -2;
	public static final Command DISMISS_COMMAND = new Command("OK", Command.OK, 0);

	private String text;
	private Image image;
	private AlertType type;
	private int timeout = FOREVER;
	private Gauge indicator;
	Displayable returnTo;

	public Alert(String title) {
		super(title);
	}

	public Alert(String title, String alertText, Image alertImage, AlertType alertType) {
		super(title);
		text = alertText;
		image = alertImage;
		type = alertType;
	}

	public int getDefaultTimeout() {
		return FOREVER;
	}

	public int getTimeout() {
		return timeout;
	}

	public void setTimeout(int time) {
		if (time != FOREVER && time <= 0) {
			throw new IllegalArgumentException("timeout");
		}
		timeout = time;
	}

	public AlertType getType() {
		return type;
	}

	public void setType(AlertType type) {
		this.type = type;
		Display.repaint(this);
	}

	public String getString() {
		return text;
	}

	public void setString(String text) {
		this.text = text;
		Display.repaint(this);
	}

	public Image getImage() {
		return image;
	}

	public void setImage(Image image) {
		this.image = image;
		Display.repaint(this);
	}

	public void setIndicator(Gauge gauge) {
		if (gauge != null && (gauge.isInteractive() || gauge.owner != null)) {
			throw new IllegalArgumentException("indicator");
		}
		indicator = gauge;
		Display.repaint(this);
	}

	public Gauge getIndicator() {
		return indicator;
	}

	public void addCommand(Command command) {
		if (command == DISMISS_COMMAND) {
			return;
		}
		super.addCommand(command);
	}
}
