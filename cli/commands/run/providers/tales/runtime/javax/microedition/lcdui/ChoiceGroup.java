package javax.microedition.lcdui;

public class ChoiceGroup extends Item implements Choice {
	final ChoiceList choices;
	int cursor;

	public ChoiceGroup(String label, int choiceType) {
		this(label, choiceType, null, null);
	}

	public ChoiceGroup(String label, int choiceType, String[] stringElements, Image[] imageElements) {
		super(label);
		if (choiceType != EXCLUSIVE && choiceType != MULTIPLE && choiceType != POPUP) {
			throw new IllegalArgumentException("type");
		}
		choices = new ChoiceList(choiceType);
		fill(stringElements, imageElements);
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
		changed();
		return index;
	}

	public void insert(int elementNum, String stringPart, Image imagePart) {
		choices.insert(elementNum, stringPart, imagePart);
		changed();
	}

	public void delete(int elementNum) {
		choices.delete(elementNum);
		fitCursor();
		changed();
	}

	public void deleteAll() {
		choices.deleteAll();
		cursor = 0;
		changed();
	}

	public void set(int elementNum, String stringPart, Image imagePart) {
		choices.set(elementNum, stringPart, imagePart);
		changed();
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
		if (selected) {
			cursor = elementNum;
		}
		changed();
	}

	public void setSelectedFlags(boolean[] selectedArray) {
		choices.setSelectedFlags(selectedArray);
		changed();
	}

	public void setFitPolicy(int fitPolicy) {
		choices.setFitPolicy(fitPolicy);
	}

	public int getFitPolicy() {
		return choices.getFitPolicy();
	}

	public void setFont(int elementNum, Font font) {
		choices.setFont(elementNum, font);
		changed();
	}

	public Font getFont(int elementNum) {
		return choices.getFont(elementNum);
	}

	void moveRow(int delta) {
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
			notifyStateChanged();
		}
		changed();
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
		notifyStateChanged();
		changed();
	}

	private void fill(String[] stringElements, Image[] imageElements) {
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
			choices.append(stringElements[index], imageElements == null ? null : imageElements[index]);
		}
	}

	private void fitCursor() {
		if (cursor >= choices.size()) {
			cursor = Math.max(0, choices.size() - 1);
		}
	}
}
