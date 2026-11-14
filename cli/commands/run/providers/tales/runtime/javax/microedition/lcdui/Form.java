package javax.microedition.lcdui;

import java.util.ArrayList;

public class Form extends Screen {
	final ArrayList<Item> items = new ArrayList<Item>();
	ItemStateListener states;
	int focusIndex;
	int scroll;

	public Form(String title) {
		super(title);
	}

	public Form(String title, Item[] items) {
		super(title);
		if (items != null) {
			for (int index = 0; index < items.length; index++) {
				append(items[index]);
			}
		}
	}

	public int append(Item item) {
		insert(items.size(), item);
		return items.size() - 1;
	}

	public int append(String text) {
		return append(new StringItem(null, text));
	}

	public int append(Image image) {
		return append(new ImageItem(null, image, ImageItem.LAYOUT_DEFAULT, null));
	}

	public void insert(int index, Item item) {
		if (item == null) {
			throw new NullPointerException("item");
		}
		if (index < 0 || index > items.size()) {
			throw new IndexOutOfBoundsException(String.valueOf(index));
		}
		item.claim(this);
		items.add(index, item);
		Display.repaint(this);
	}

	public void delete(int index) {
		Item item = items.remove(index);
		item.release();
		if (focusIndex >= items.size()) {
			focusIndex = Math.max(0, items.size() - 1);
		}
		Display.repaint(this);
	}

	public void deleteAll() {
		for (int index = 0; index < items.size(); index++) {
			items.get(index).release();
		}
		items.clear();
		focusIndex = 0;
		scroll = 0;
		Display.repaint(this);
	}

	public void set(int index, Item item) {
		if (item == null) {
			throw new NullPointerException("item");
		}
		if (index < 0 || index >= items.size()) {
			throw new IndexOutOfBoundsException(String.valueOf(index));
		}
		item.claim(this);
		items.get(index).release();
		items.set(index, item);
		Display.repaint(this);
	}

	public Item get(int index) {
		return items.get(index);
	}

	public void setItemStateListener(ItemStateListener listener) {
		states = listener;
	}

	public int size() {
		return items.size();
	}

	Item focusedItem() {
		if (focusIndex < 0 || focusIndex >= items.size()) {
			return null;
		}
		return items.get(focusIndex);
	}

	void focus(Item item) {
		int index = items.indexOf(item);
		focusIndex = index < 0 ? 0 : index;
	}

	void moveFocus(int delta) {
		if (items.isEmpty()) {
			return;
		}
		focusIndex += delta;
		if (focusIndex < 0) {
			focusIndex = 0;
		}
		if (focusIndex >= items.size()) {
			focusIndex = items.size() - 1;
		}
		Display.repaint(this);
	}

	void attach(boolean shown) {
		for (int index = 0; index < items.size(); index++) {
			Item item = items.get(index);
			if (item instanceof CustomItem) {
				CustomItem custom = (CustomItem) item;
				if (shown) {
					custom.showNotify();
				} else {
					custom.hideNotify();
				}
			}
		}
	}
}
