package javax.microedition.lcdui;

public class TextBox extends Screen {
	final TextBuffer buffer;

	public TextBox(String title, String text, int maxSize, int constraints) {
		super(title);
		buffer = new TextBuffer(text, maxSize, constraints);
	}

	public String getString() {
		return buffer.get();
	}

	public void setString(String text) {
		buffer.set(text);
		Display.repaint(this);
	}

	public int getChars(char[] data) {
		return buffer.getChars(data);
	}

	public void setChars(char[] data, int offset, int length) {
		buffer.setChars(data, offset, length);
		Display.repaint(this);
	}

	public void insert(String source, int position) {
		buffer.insert(source, position);
		Display.repaint(this);
	}

	public void insert(char[] data, int offset, int length, int position) {
		buffer.insert(data, offset, length, position);
		Display.repaint(this);
	}

	public void delete(int offset, int length) {
		buffer.delete(offset, length);
		Display.repaint(this);
	}

	public int getMaxSize() {
		return buffer.max();
	}

	public int setMaxSize(int maxSize) {
		int assigned = buffer.setMax(maxSize);
		Display.repaint(this);
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
		Display.repaint(this);
	}

	public void setInitialInputMode(String characterSubset) {}
}
