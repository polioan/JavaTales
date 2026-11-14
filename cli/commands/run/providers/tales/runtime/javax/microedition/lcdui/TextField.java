package javax.microedition.lcdui;

public class TextField extends Item {
	public static final int ANY = 0;
	public static final int EMAILADDR = 1;
	public static final int NUMERIC = 2;
	public static final int PHONENUMBER = 3;
	public static final int URL = 4;
	public static final int DECIMAL = 5;
	public static final int PASSWORD = 0x10000;
	public static final int UNEDITABLE = 0x20000;
	public static final int SENSITIVE = 0x40000;
	public static final int NON_PREDICTIVE = 0x80000;
	public static final int INITIAL_CAPS_WORD = 0x100000;
	public static final int INITIAL_CAPS_SENTENCE = 0x200000;
	public static final int CONSTRAINT_MASK = 0xFFFF;

	final TextBuffer buffer;

	public TextField(String label, String text, int maxSize, int constraints) {
		super(label);
		buffer = new TextBuffer(text, maxSize, constraints);
	}

	public String getString() {
		return buffer.get();
	}

	public void setString(String text) {
		buffer.set(text);
		changed();
	}

	public int getChars(char[] data) {
		return buffer.getChars(data);
	}

	public void setChars(char[] data, int offset, int length) {
		buffer.setChars(data, offset, length);
		changed();
	}

	public void insert(String source, int position) {
		buffer.insert(source, position);
		changed();
	}

	public void insert(char[] data, int offset, int length, int position) {
		buffer.insert(data, offset, length, position);
		changed();
	}

	public void delete(int offset, int length) {
		buffer.delete(offset, length);
		changed();
	}

	public int getMaxSize() {
		return buffer.max();
	}

	public int setMaxSize(int maxSize) {
		int assigned = buffer.setMax(maxSize);
		changed();
		return assigned;
	}

	public int size() {
		return buffer.size();
	}

	public int getCaretPosition() {
		return buffer.caret();
	}

	public int getConstraints() {
		return buffer.constraints();
	}

	public void setConstraints(int constraints) {
		buffer.setConstraints(constraints);
		changed();
	}

	public void setInitialInputMode(String characterSubset) {}
}
