package javax.microedition.lcdui;

final class TextBuffer {
	private String text;
	private int max;
	private int constraints;
	private int caret;

	TextBuffer(String text, int max, int constraints) {
		if (max <= 0) {
			throw new IllegalArgumentException("max");
		}
		this.max = max;
		this.constraints = constraints;
		this.text = accepted(text == null ? "" : text);
		this.caret = this.text.length();
	}

	String get() {
		return text;
	}

	String shown() {
		if ((constraints & TextField.PASSWORD) == 0) {
			return text;
		}
		char[] stars = new char[text.length()];
		for (int index = 0; index < stars.length; index++) {
			stars[index] = '*';
		}
		return new String(stars);
	}

	int max() {
		return max;
	}

	int constraints() {
		return constraints;
	}

	int caret() {
		return caret;
	}

	int size() {
		return text.length();
	}

	void set(String value) {
		text = accepted(value == null ? "" : value);
		caret = text.length();
	}

	int setMax(int max) {
		if (max <= 0) {
			throw new IllegalArgumentException("max");
		}
		this.max = max;
		if (text.length() > max) {
			text = text.substring(0, max);
			if (caret > text.length()) {
				caret = text.length();
			}
		}
		return max;
	}

	void setConstraints(int constraints) {
		accepted(text, constraints);
		this.constraints = constraints;
	}

	void insert(String source, int position) {
		if (source == null) {
			throw new NullPointerException("text");
		}
		place(position);
		replace(position, 0, source);
	}

	void insert(char[] data, int offset, int length, int position) {
		insert(new String(data, offset, length), position);
	}

	void delete(int offset, int length) {
		if (length < 0) {
			throw new StringIndexOutOfBoundsException(length);
		}
		place(offset);
		place(offset + length);
		replace(offset, length, "");
	}

	int getChars(char[] data) {
		if (data.length < text.length()) {
			throw new ArrayIndexOutOfBoundsException(data.length);
		}
		text.getChars(0, text.length(), data, 0);
		return text.length();
	}

	void setChars(char[] data, int offset, int length) {
		set(new String(data, offset, length));
	}

	boolean editable() {
		return (constraints & TextField.UNEDITABLE) == 0;
	}

	void type(char character) {
		if (!editable() || text.length() >= max) {
			return;
		}
		String next = text.substring(0, caret) + character + text.substring(caret);
		if (!allows(next, constraints)) {
			return;
		}
		text = next;
		caret++;
	}

	void backspace() {
		if (!editable() || caret <= 0) {
			return;
		}
		text = text.substring(0, caret - 1) + text.substring(caret);
		caret--;
	}

	private void place(int position) {
		if (position < 0 || position > text.length()) {
			throw new StringIndexOutOfBoundsException(position);
		}
	}

	private void replace(int position, int length, String source) {
		String next = text.substring(0, position) + source + text.substring(position + length);
		text = accepted(next);
		caret = position + source.length();
		if (caret > text.length()) {
			caret = text.length();
		}
	}

	private String accepted(String value) {
		return accepted(value, constraints);
	}

	private String accepted(String value, int mode) {
		if (value.length() > max) {
			throw new IllegalArgumentException("size");
		}
		if (!allows(value, mode)) {
			throw new IllegalArgumentException("constraints");
		}
		return value;
	}

	private static boolean allows(String value, int mode) {
		int kind = mode & TextField.CONSTRAINT_MASK;
		if (kind == TextField.ANY || kind == TextField.EMAILADDR || kind == TextField.URL || value.length() == 0) {
			return kind == TextField.ANY || kind == TextField.EMAILADDR || kind == TextField.URL || kind == TextField.NUMERIC
				|| kind == TextField.PHONENUMBER || kind == TextField.DECIMAL;
		}
		for (int index = 0; index < value.length(); index++) {
			char character = value.charAt(index);
			if (kind == TextField.NUMERIC && (character < '0' || character > '9')) {
				return false;
			}
			if (kind == TextField.PHONENUMBER && character != '+' && character != '*' && character != '#'
				&& (character < '0' || character > '9')) {
				return false;
			}
			if (kind == TextField.DECIMAL && character != '-' && character != '.' && (character < '0' || character > '9')) {
				return false;
			}
		}
		return true;
	}
}
