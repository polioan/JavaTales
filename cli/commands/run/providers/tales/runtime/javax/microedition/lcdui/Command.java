package javax.microedition.lcdui;

public class Command {
	public static final int SCREEN = 1;
	public static final int BACK = 2;
	public static final int CANCEL = 3;
	public static final int OK = 4;
	public static final int HELP = 5;
	public static final int STOP = 6;
	public static final int EXIT = 7;
	public static final int ITEM = 8;

	private final String label;
	private final String longLabel;
	private final int commandType;
	private final int priority;

	public Command(String label, int commandType, int priority) {
		this(label, label, commandType, priority);
	}

	public Command(String label, String longLabel, int commandType, int priority) {
		if (label == null) {
			throw new NullPointerException("label");
		}
		this.label = label;
		this.longLabel = longLabel == null ? label : longLabel;
		this.commandType = commandType;
		this.priority = priority;
	}

	public String getLabel() {
		return label;
	}

	public String getLongLabel() {
		return longLabel;
	}

	public int getCommandType() {
		return commandType;
	}

	public int getPriority() {
		return priority;
	}
}
