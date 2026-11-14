package javax.microedition.lcdui;

import java.util.ArrayList;

final class ChoiceList {
	private final int type;
	private final ArrayList<String> strings = new ArrayList<String>();
	private final ArrayList<Image> images = new ArrayList<Image>();
	private final ArrayList<Font> fonts = new ArrayList<Font>();
	private final ArrayList<Boolean> selected = new ArrayList<Boolean>();
	private int picked = -1;
	private int fit = Choice.TEXT_WRAP_DEFAULT;

	ChoiceList(int type) {
		this.type = type;
	}

	int type() {
		return type;
	}

	int size() {
		return strings.size();
	}

	String getString(int index) {
		check(index);
		return strings.get(index);
	}

	Image getImage(int index) {
		check(index);
		return images.get(index);
	}

	Font getFont(int index) {
		check(index);
		return fonts.get(index);
	}

	int append(String stringPart, Image imagePart) {
		insert(strings.size(), stringPart, imagePart);
		return strings.size() - 1;
	}

	void insert(int index, String stringPart, Image imagePart) {
		if (stringPart == null) {
			throw new NullPointerException("string");
		}
		if (index < 0 || index > strings.size()) {
			throw new IndexOutOfBoundsException(String.valueOf(index));
		}
		strings.add(index, stringPart);
		images.add(index, imagePart);
		fonts.add(index, null);
		selected.add(index, Boolean.FALSE);
		if (exclusive()) {
			if (picked < 0) {
				picked = index;
			} else if (index <= picked) {
				picked++;
			}
			markExclusive();
		}
	}

	void delete(int index) {
		check(index);
		strings.remove(index);
		images.remove(index);
		fonts.remove(index);
		selected.remove(index);
		if (exclusive()) {
			if (strings.isEmpty()) {
				picked = -1;
			} else if (picked > index) {
				picked--;
			} else if (picked >= strings.size()) {
				picked = strings.size() - 1;
			}
			markExclusive();
		}
	}

	void deleteAll() {
		strings.clear();
		images.clear();
		fonts.clear();
		selected.clear();
		picked = -1;
	}

	void set(int index, String stringPart, Image imagePart) {
		check(index);
		if (stringPart == null) {
			throw new NullPointerException("string");
		}
		strings.set(index, stringPart);
		images.set(index, imagePart);
	}

	boolean isSelected(int index) {
		check(index);
		if (exclusive()) {
			return index == picked;
		}
		return selected.get(index).booleanValue();
	}

	int getSelectedIndex() {
		if (!exclusive()) {
			return -1;
		}
		return picked;
	}

	int getSelectedFlags(boolean[] flags) {
		if (flags == null) {
			throw new NullPointerException("flags");
		}
		if (flags.length < strings.size()) {
			throw new IndexOutOfBoundsException(String.valueOf(flags.length));
		}
		int count = 0;
		for (int index = 0; index < strings.size(); index++) {
			flags[index] = isSelected(index);
			if (flags[index]) {
				count++;
			}
		}
		return count;
	}

	void setSelectedIndex(int index, boolean on) {
		check(index);
		if (exclusive()) {
			if (!on) {
				return;
			}
			picked = index;
			markExclusive();
			return;
		}
		selected.set(index, on ? Boolean.TRUE : Boolean.FALSE);
	}

	void setSelectedFlags(boolean[] flags) {
		if (flags == null) {
			throw new NullPointerException("flags");
		}
		if (flags.length < strings.size()) {
			throw new IndexOutOfBoundsException(String.valueOf(flags.length));
		}
		if (exclusive()) {
			int found = -1;
			for (int index = 0; index < strings.size(); index++) {
				if (flags[index]) {
					found = index;
					break;
				}
			}
			picked = found < 0 && strings.size() > 0 ? 0 : found;
			markExclusive();
			return;
		}
		for (int index = 0; index < strings.size(); index++) {
			selected.set(index, flags[index] ? Boolean.TRUE : Boolean.FALSE);
		}
	}

	void setFitPolicy(int fitPolicy) {
		if (fitPolicy != Choice.TEXT_WRAP_DEFAULT && fitPolicy != Choice.TEXT_WRAP_ON && fitPolicy != Choice.TEXT_WRAP_OFF) {
			throw new IllegalArgumentException("fit");
		}
		fit = fitPolicy;
	}

	int getFitPolicy() {
		return fit;
	}

	void setFont(int index, Font font) {
		check(index);
		fonts.set(index, font);
	}

	private boolean exclusive() {
		return type != Choice.MULTIPLE;
	}

	private void markExclusive() {
		for (int index = 0; index < selected.size(); index++) {
			selected.set(index, index == picked ? Boolean.TRUE : Boolean.FALSE);
		}
	}

	private void check(int index) {
		if (index < 0 || index >= strings.size()) {
			throw new IndexOutOfBoundsException(String.valueOf(index));
		}
	}
}
