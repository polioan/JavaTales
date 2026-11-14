package javax.microedition.lcdui;

public class List extends Screen implements Choice {
	public static final Command SELECT_COMMAND = new Command("Select", Command.SCREEN, 0);

	final ChoiceList choices;
	int cursor;
	int scroll;

	public List(String title, int listType) {
		super(title);
		if (listType != IMPLICIT && listType != EXCLUSIVE && listType != MULTIPLE) {
			throw new IllegalArgumentException("type");
		}
		choices = new ChoiceList(listType);
	}

	public List(String title, int listType, String[] stringElements, Image[] imageElements) {
		this(title, listType);
		if (stringElements == null) {
			if (imageElements != null) {
				throw new NullPointerException("strings");
			}
			return;
		}
		if (imageElements != null && imageElements.length != stringElements.length) {
			throw new IllegalArgumentException("length");
		}
		for (int index = 0; index < stringElements.length; index++) {
			append(stringElements[index], imageElements == null ? null : imageElements[index]);
		}
	}

	public int size() {
		return choices.size();
	}

	public String getString(int elementNum) {
		return choices.getString(elementNum);
	}

	public Image getImage(int elementNum) {
		return choices.getImage(elementNum);
	}

	public int append(String stringPart, Image imagePart) {
		int index = choices.append(stringPart, imagePart);
		Display.repaint(this);
		return index;
	}

	public void insert(int elementNum, String stringPart, Image imagePart) {
		choices.insert(elementNum, stringPart, imagePart);
		Display.repaint(this);
	}

	public void delete(int elementNum) {
		choices.delete(elementNum);
		fitCursor();
		Display.repaint(this);
	}

	public void deleteAll() {
		choices.deleteAll();
		cursor = 0;
		scroll = 0;
		Display.repaint(this);
	}

	public void set(int elementNum, String stringPart, Image imagePart) {
		choices.set(elementNum, stringPart, imagePart);
		Display.repaint(this);
	}

	public boolean isSelected(int elementNum) {
		return choices.isSelected(elementNum);
	}

	public int getSelectedIndex() {
		return choices.getSelectedIndex();
	}

	public int getSelectedFlags(boolean[] selectedArray) {
		return choices.getSelectedFlags(selectedArray);
	}

	public void setSelectedIndex(int elementNum, boolean selected) {
		choices.setSelectedIndex(elementNum, selected);
		if (selected || choices.type() == MULTIPLE) {
			cursor = elementNum;
		}
		Display.repaint(this);
	}

	public void setSelectedFlags(boolean[] selectedArray) {
		choices.setSelectedFlags(selectedArray);
		if (choices.getSelectedIndex() >= 0) {
			cursor = choices.getSelectedIndex();
		}
		Display.repaint(this);
	}

	public void setFitPolicy(int fitPolicy) {
		choices.setFitPolicy(fitPolicy);
	}

	public int getFitPolicy() {
		return choices.getFitPolicy();
	}

	public void setFont(int elementNum, Font font) {
		choices.setFont(elementNum, font);
		Display.repaint(this);
	}

	public Font getFont(int elementNum) {
		return choices.getFont(elementNum);
	}

	void moveCursor(int delta) {
		if (choices.size() == 0) {
			return;
		}
		cursor += delta;
		if (cursor < 0) {
			cursor = 0;
		}
		if (cursor >= choices.size()) {
			cursor = choices.size() - 1;
		}
		if (choices.type() != MULTIPLE) {
			choices.setSelectedIndex(cursor, true);
		}
		Display.repaint(this);
	}

	void toggle() {
		if (choices.size() == 0) {
			return;
		}
		if (choices.type() == MULTIPLE) {
			choices.setSelectedIndex(cursor, !choices.isSelected(cursor));
		} else {
			choices.setSelectedIndex(cursor, true);
		}
		Display.repaint(this);
	}

	private void fitCursor() {
		if (choices.getSelectedIndex() >= 0) {
			cursor = choices.getSelectedIndex();
		}
		if (cursor >= choices.size()) {
			cursor = Math.max(0, choices.size() - 1);
		}
	}
}
