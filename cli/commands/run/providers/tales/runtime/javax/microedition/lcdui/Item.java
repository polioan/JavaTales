package javax.microedition.lcdui;

import java.util.ArrayList;

public abstract class Item {
	public static final int BUTTON = 2;
	public static final int HYPERLINK = 1;
	public static final int LAYOUT_2 = 0x4000;
	public static final int LAYOUT_BOTTOM = 0x20;
	public static final int LAYOUT_CENTER = 3;
	public static final int LAYOUT_DEFAULT = 0;
	public static final int LAYOUT_EXPAND = 0x800;
	public static final int LAYOUT_LEFT = 1;
	public static final int LAYOUT_NEWLINE_AFTER = 0x200;
	public static final int LAYOUT_NEWLINE_BEFORE = 0x100;
	public static final int LAYOUT_RIGHT = 2;
	public static final int LAYOUT_SHRINK = 0x400;
	public static final int LAYOUT_TOP = 0x10;
	public static final int LAYOUT_VCENTER = 0x30;
	public static final int LAYOUT_VEXPAND = 0x2000;
	public static final int LAYOUT_VSHRINK = 0x1000;
	public static final int PLAIN = 0;

	String label;
	int layout;
	int preferredWidth = -1;
	int preferredHeight = -1;
	Form owner;
	Command defaultCommand;
	ItemCommandListener itemListener;
	final ArrayList<Command> commands = new ArrayList<Command>();

	protected Item(String label) {
		this.label = label;
	}

	public String getLabel() {
		return label;
	}

	public void setLabel(String label) {
		this.label = label;
		changed();
	}

	public int getLayout() {
		return layout;
	}

	public void setLayout(int layout) {
		this.layout = layout;
		changed();
	}

	public void addCommand(Command command) {
		if (command == null) {
			throw new NullPointerException("command");
		}
		if (!commands.contains(command)) {
			commands.add(command);
		}
		changed();
	}

	public void removeCommand(Command command) {
		if (command == null) {
			throw new NullPointerException("command");
		}
		commands.remove(command);
		changed();
	}

	public void setDefaultCommand(Command command) {
		defaultCommand = command;
		changed();
	}

	public void setItemCommandListener(ItemCommandListener listener) {
		itemListener = listener;
	}

	public int getPreferredWidth() {
		return preferredWidth;
	}

	public int getPreferredHeight() {
		return preferredHeight;
	}

	public int getMinimumWidth() {
		return 0;
	}

	public int getMinimumHeight() {
		return 0;
	}

	public void setPreferredSize(int width, int height) {
		if (width < -1 || height < -1) {
			throw new IllegalArgumentException("size");
		}
		preferredWidth = width;
		preferredHeight = height;
		changed();
	}

	public void notifyStateChanged() {
		if (owner != null && owner.states != null) {
			owner.states.itemStateChanged(this);
		}
	}

	void claim(Form form) {
		if (owner != null) {
			throw new IllegalStateException("owned");
		}
		owner = form;
	}

	void release() {
		owner = null;
	}

	void changed() {
		if (owner != null) {
			Display.repaint(owner);
		}
	}
}
