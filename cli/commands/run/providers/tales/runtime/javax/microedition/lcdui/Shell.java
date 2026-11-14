package javax.microedition.lcdui;

final class Shell {
	private static final int TITLE = 28;
	private static final int BAR = 26;

	private Shell() {}

	static void paint(Displayable displayable) {
		Graphics graphics = javatales.rt.Screen.bufferGraphics();
		if (graphics == null) {
			return;
		}
		int width = javatales.rt.Screen.WIDTH;
		int height = javatales.rt.Screen.HEIGHT;
		graphics.setClip(0, 0, width, height);
		graphics.setColor(0xFFFFFF);
		graphics.fillRect(0, 0, width, height);
		paintChrome(graphics, displayable, width);
		int top = contentTop(displayable);
		int view = height - top - BAR;
		int offset = focusOffset(graphics, displayable, width - 16);
		int block = focusBlock(graphics, displayable, width - 16);
		int scroll = scroll(displayable);
		if (offset < scroll) {
			scroll = offset;
		}
		if (offset + block > scroll + view) {
			scroll = offset + block - view;
		}
		if (scroll < 0) {
			scroll = 0;
		}
		scroll(displayable, scroll);
		graphics.setClip(0, top, width, view);
		body(graphics, displayable, 8, top - scroll, width - 16, true);
		graphics.setClip(0, 0, width, height);
		paintCommands(graphics, displayable, width, height);
		javatales.rt.Screen.flush();
	}

	static void key(Displayable displayable, int code, boolean down) {
		if (displayable instanceof Form) {
			Item item = ((Form) displayable).focusedItem();
			if (item instanceof CustomItem) {
				CustomItem custom = (CustomItem) item;
				if (down) {
					custom.keyPressed(code);
				} else {
					custom.keyReleased(code);
				}
			}
		}
		if (!down) {
			return;
		}
		TextBuffer editing = editing(displayable);
		if (editing != null && code >= Canvas.KEY_NUM0 && code <= Canvas.KEY_NUM9) {
			editing.type((char) code);
			Display.repaint(displayable);
			return;
		}
		if (editing != null && (code == Canvas.KEY_STAR || code == Canvas.KEY_POUND)) {
			editing.type((char) code);
			Display.repaint(displayable);
			return;
		}
		if (editing != null && code == -3) {
			editing.backspace();
			Display.repaint(displayable);
			return;
		}
		if (code == -1 || (!editing(displayable, true) && code == Canvas.KEY_NUM2)) {
			move(displayable, -1);
			return;
		}
		if (code == -2 || (!editing(displayable, true) && code == Canvas.KEY_NUM8)) {
			move(displayable, 1);
			return;
		}
		if (code == -3) {
			adjust(displayable, -1);
			return;
		}
		if (code == -4) {
			adjust(displayable, 1);
			return;
		}
		if (code == -5 || (!editing(displayable, true) && code == Canvas.KEY_NUM5)) {
			select(displayable);
			return;
		}
		if (code == -6) {
			fire(displayable, command(displayable, true));
			return;
		}
		if (code == -7) {
			fire(displayable, command(displayable, false));
		}
	}

	private static boolean editing(Displayable displayable, boolean ignored) {
		return editing(displayable) != null;
	}

	private static TextBuffer editing(Displayable displayable) {
		if (displayable instanceof TextBox) {
			TextBuffer buffer = ((TextBox) displayable).buffer;
			return buffer.editable() ? buffer : null;
		}
		if (displayable instanceof Form) {
			Item item = ((Form) displayable).focusedItem();
			if (item instanceof TextField) {
				TextBuffer buffer = ((TextField) item).buffer;
				return buffer.editable() ? buffer : null;
			}
		}
		return null;
	}

	private static void move(Displayable displayable, int delta) {
		if (displayable instanceof List) {
			((List) displayable).moveCursor(delta);
			return;
		}
		if (!(displayable instanceof Form)) {
			return;
		}
		Form form = (Form) displayable;
		Item item = form.focusedItem();
		if (item instanceof ChoiceGroup && form.size() == 1) {
			((ChoiceGroup) item).moveRow(delta);
			return;
		}
		if (item instanceof CustomItem) {
			int[] visible = new int[4];
			int direction = delta < 0 ? Canvas.UP : Canvas.DOWN;
			if (((CustomItem) item).traverse(direction, displayable.getWidth(), displayable.getHeight(), visible)) {
				return;
			}
		}
		form.moveFocus(delta);
	}

	private static void adjust(Displayable displayable, int delta) {
		if (!(displayable instanceof Form)) {
			return;
		}
		Item item = ((Form) displayable).focusedItem();
		if (item instanceof ChoiceGroup) {
			((ChoiceGroup) item).moveRow(delta);
		} else if (item instanceof Gauge) {
			((Gauge) item).nudge(delta);
		}
	}

	private static void select(Displayable displayable) {
		if (displayable instanceof Form) {
			Item item = ((Form) displayable).focusedItem();
			if (item instanceof ChoiceGroup && ((ChoiceGroup) item).choices.type() == Choice.MULTIPLE) {
				((ChoiceGroup) item).toggle();
				return;
			}
			if (item != null && item.defaultCommand != null && item.itemListener != null) {
				item.itemListener.commandAction(item.defaultCommand, item);
				return;
			}
		}
		if (displayable instanceof List && ((List) displayable).choices.type() == Choice.IMPLICIT) {
			fire(displayable, List.SELECT_COMMAND);
			return;
		}
		if (displayable instanceof List && ((List) displayable).choices.type() == Choice.MULTIPLE) {
			((List) displayable).toggle();
			return;
		}
		fire(displayable, command(displayable, true));
	}

	private static void fire(Displayable displayable, Command command) {
		if (command == null) {
			return;
		}
		if (displayable.listener != null) {
			displayable.listener.commandAction(command, displayable);
		}
		if (displayable instanceof Alert && command == Alert.DISMISS_COMMAND && Display.shown() == displayable) {
			Alert alert = (Alert) displayable;
			if (alert.returnTo != null) {
				Display.getDisplay(null).setCurrent(alert.returnTo);
			}
		}
	}

	private static void paintChrome(Graphics graphics, Displayable displayable, int width) {
		graphics.setColor(0x0A3A66);
		graphics.fillRect(0, 0, width, TITLE);
		graphics.setColor(0xFFFFFF);
		graphics.setFont(Font.getFont(Font.FACE_PROPORTIONAL, Font.STYLE_BOLD, Font.SIZE_MEDIUM));
		String title = displayable.getTitle();
		if (title != null && title.length() > 0) {
			graphics.drawString(fit(graphics, title, width - 16), 8, 6, Graphics.LEFT | Graphics.TOP);
		}
		Ticker ticker = displayable.getTicker();
		if (ticker != null) {
			graphics.setColor(0xE8EEF4);
			graphics.fillRect(0, TITLE, width, 18);
			graphics.setColor(0x333333);
			graphics.setFont(Font.getDefaultFont());
			graphics.drawString(fit(graphics, ticker.getString(), width - 16), 8, TITLE + 1, Graphics.LEFT | Graphics.TOP);
		}
	}

	private static int contentTop(Displayable displayable) {
		return displayable.getTicker() == null ? TITLE + 4 : TITLE + 22;
	}

	private static void paintCommands(Graphics graphics, Displayable displayable, int width, int height) {
		Command[] slots = bars(displayable);
		graphics.setColor(0x0A3A66);
		graphics.fillRect(0, height - BAR, width, BAR);
		graphics.setColor(0xFFFFFF);
		graphics.setFont(Font.getFont(Font.FACE_PROPORTIONAL, Font.STYLE_BOLD, Font.SIZE_SMALL));
		if (slots[0] != null) {
			graphics.drawString(fit(graphics, label(slots[0]), width / 2 - 12), 8, height - BAR + 5, Graphics.LEFT | Graphics.TOP);
		}
		if (slots[1] != null) {
			graphics.drawString(fit(graphics, label(slots[1]), width / 2 - 12), width - 8, height - BAR + 5, Graphics.RIGHT | Graphics.TOP);
		}
	}

	private static int body(Graphics graphics, Displayable displayable, int x, int y, int width, boolean draw) {
		graphics.setFont(Font.getDefaultFont());
		graphics.setColor(0x111111);
		if (displayable instanceof Form) {
			Form form = (Form) displayable;
			for (int index = 0; index < form.size(); index++) {
				if (draw && index == form.focusIndex) {
					int block = item(graphics, form.get(index), x, y, width, false);
					graphics.setColor(0xD6E8FA);
					graphics.fillRect(4, y, javatales.rt.Screen.WIDTH - 8, block);
				}
				y += item(graphics, form.get(index), x, y, width, draw);
			}
			return y;
		}
		if (displayable instanceof List) {
			return rows(graphics, ((List) displayable).choices, ((List) displayable).cursor, x, y, width, draw);
		}
		if (displayable instanceof TextBox) {
			return field(graphics, ((TextBox) displayable).buffer, x, y, width, draw);
		}
		if (displayable instanceof Alert) {
			return alert(graphics, (Alert) displayable, x, y, width, draw);
		}
		return y + graphics.getFont().getHeight();
	}

	private static int focusOffset(Graphics graphics, Displayable displayable, int width) {
		if (displayable instanceof Form) {
			Form form = (Form) displayable;
			int y = 0;
			for (int index = 0; index < form.focusIndex && index < form.size(); index++) {
				y += item(graphics, form.get(index), 0, 0, width, false);
			}
			return y;
		}
		if (displayable instanceof List) {
			return ((List) displayable).cursor * row(graphics);
		}
		return 0;
	}

	private static int focusBlock(Graphics graphics, Displayable displayable, int width) {
		if (displayable instanceof Form) {
			Item item = ((Form) displayable).focusedItem();
			if (item == null) {
				return 0;
			}
			return item(graphics, item, 0, 0, width, false);
		}
		if (displayable instanceof List) {
			return row(graphics);
		}
		return graphics.getFont().getHeight();
	}

	private static int item(Graphics graphics, Item entry, int x, int y, int width, boolean draw) {
		int start = y;
		graphics.setFont(Font.getDefaultFont());
		graphics.setColor(0x555555);
		if (entry.getLabel() != null && entry.getLabel().length() > 0) {
			y = text(graphics, entry.getLabel(), x, y, width, draw);
		}
		graphics.setColor(0x111111);
		graphics.setFont(Font.getDefaultFont());
		if (entry instanceof StringItem) {
			StringItem stringItem = (StringItem) entry;
			if (stringItem.getFont() != null) {
				graphics.setFont(stringItem.getFont());
			}
			if (draw && stringItem.getAppearanceMode() == Item.BUTTON) {
				graphics.drawRect(x, y, width - 1, graphics.getFont().getHeight() + 3);
			}
			y = text(graphics, stringItem.getText(), x + 4, y + 2, width - 8, draw);
			y += 4;
		} else if (entry instanceof ImageItem) {
			ImageItem imageItem = (ImageItem) entry;
			Image image = imageItem.getImage();
			if (image != null) {
				if (draw) {
					graphics.drawImage(image, x, y, Graphics.LEFT | Graphics.TOP);
				}
				y += image.getHeight() + 4;
			} else {
				y = text(graphics, imageItem.getAltText(), x, y, width, draw);
			}
		} else if (entry instanceof TextField) {
			y = field(graphics, ((TextField) entry).buffer, x, y, width, draw);
		} else if (entry instanceof ChoiceGroup) {
			ChoiceGroup group = (ChoiceGroup) entry;
			y = rows(graphics, group.choices, group.cursor, x, y, width, draw);
		} else if (entry instanceof Gauge) {
			y = gauge(graphics, (Gauge) entry, x, y, width, draw);
		} else if (entry instanceof DateField) {
			y = text(graphics, ((DateField) entry).shown(), x, y, width, draw);
		} else if (entry instanceof Spacer) {
			y += Math.max(((Spacer) entry).getMinimumHeight(), 1);
		} else if (entry instanceof CustomItem) {
			CustomItem custom = (CustomItem) entry;
			int contentWidth = custom.getPreferredWidth() >= 0 ? custom.getPreferredWidth() : width;
			int contentHeight = custom.getPreferredHeight() >= 0 ? custom.getPreferredHeight() : Math.max(custom.getMinimumHeight(), graphics.getFont().getHeight());
			if (draw) {
				graphics.translate(x, y);
				try {
					custom.paint(graphics, contentWidth, contentHeight);
				} finally {
					graphics.translate(-x, -y);
				}
			}
			y += contentHeight;
		}
		if (y == start) {
			y += graphics.getFont().getHeight();
		}
		return y - start + 6;
	}

	private static int field(Graphics graphics, TextBuffer buffer, int x, int y, int width, boolean draw) {
		int line = graphics.getFont().getHeight() + 8;
		if (draw) {
			graphics.setColor(0xFFFFFF);
			graphics.fillRect(x, y, width, line);
			graphics.setColor(0x888888);
			graphics.drawRect(x, y, width - 1, line - 1);
			graphics.setColor(0x111111);
			graphics.drawString(fit(graphics, buffer.shown(), width - 8), x + 4, y + 4, Graphics.LEFT | Graphics.TOP);
		}
		return y + line + 4;
	}

	private static int rows(Graphics graphics, ChoiceList choices, int cursor, int x, int y, int width, boolean draw) {
		if (choices.size() == 0) {
			return y + row(graphics);
		}
		if (choices.type() == Choice.POPUP) {
			int index = choices.getSelectedIndex();
			String value = index < 0 ? "" : choices.getString(index);
			if (draw) {
				graphics.setColor(0x111111);
				graphics.drawString(fit(graphics, value, width), x, y, Graphics.LEFT | Graphics.TOP);
			}
			return y + row(graphics);
		}
		for (int index = 0; index < choices.size(); index++) {
			Font font = choices.getFont(index);
			graphics.setFont(font == null ? Font.getDefaultFont() : font);
			int line = row(graphics);
			Image image = choices.getImage(index);
			if (image != null) {
				line = Math.max(line, image.getHeight() + 2);
			}
			if (draw && index == cursor) {
				graphics.setColor(0xD6E8FA);
				graphics.fillRect(x - 4, y, width + 8, line);
			}
			int textX = x;
			if (image != null && draw) {
				graphics.drawImage(image, x, y, Graphics.LEFT | Graphics.TOP);
				textX += image.getWidth() + 4;
			}
			String mark = choices.type() == Choice.MULTIPLE
				? (choices.isSelected(index) ? "[x] " : "[ ] ")
				: (choices.isSelected(index) ? "(*) " : "( ) ");
			if (draw) {
				graphics.setColor(0x111111);
				graphics.drawString(fit(graphics, mark + choices.getString(index), width - (textX - x)), textX, y + 2, Graphics.LEFT | Graphics.TOP);
			}
			y += line;
		}
		return y;
	}

	private static int alert(Graphics graphics, Alert alert, int x, int y, int width, boolean draw) {
		String kind = kind(alert.getType());
		if (kind != null) {
			graphics.setColor(0x0A3A66);
			y = text(graphics, kind, x, y, width, draw);
		}
		Image image = alert.getImage();
		if (image != null) {
			if (draw) {
				graphics.drawImage(image, x, y, Graphics.LEFT | Graphics.TOP);
			}
			y += image.getHeight() + 4;
		}
		graphics.setColor(0x111111);
		graphics.setFont(Font.getDefaultFont());
		y = text(graphics, alert.getString(), x, y, width, draw);
		if (alert.getIndicator() != null) {
			y = gauge(graphics, alert.getIndicator(), x, y, width, draw);
		}
		return y;
	}

	private static int gauge(Graphics graphics, Gauge gauge, int x, int y, int width, boolean draw) {
		if (gauge.getMaxValue() == Gauge.INDEFINITE) {
			String state = gauge.getValue() == Gauge.CONTINUOUS_RUNNING || gauge.getValue() == Gauge.INCREMENTAL_UPDATING ? "Working" : "Idle";
			return text(graphics, state, x, y, width, draw);
		}
		int line = graphics.getFont().getHeight();
		if (draw) {
			graphics.setColor(0xDDDDDD);
			graphics.fillRect(x, y + 2, width, line);
			int fill = gauge.getMaxValue() == 0 ? 0 : width * gauge.getValue() / gauge.getMaxValue();
			graphics.setColor(0x0A3A66);
			graphics.fillRect(x, y + 2, fill, line);
		}
		return y + line + 8;
	}

	private static int text(Graphics graphics, String value, int x, int y, int width, boolean draw) {
		if (value == null || value.length() == 0) {
			return y;
		}
		Font font = graphics.getFont();
		int line = font.getHeight() + 2;
		int start = 0;
		while (start < value.length()) {
			int end = start;
			int split = -1;
			while (end < value.length()) {
				char character = value.charAt(end);
				if (character == '\n' || character == '\r') {
					break;
				}
				if (character == ' ') {
					split = end;
				}
				if (end > start && font.substringWidth(value, start, end - start + 1) > width) {
					if (split > start) {
						end = split;
					}
					break;
				}
				end++;
			}
			if (draw && end > start) {
				graphics.drawSubstring(value, start, end - start, x, y, Graphics.LEFT | Graphics.TOP);
			}
			y += line;
			if (end < value.length() && (value.charAt(end) == '\n' || value.charAt(end) == '\r')) {
				if (value.charAt(end) == '\r' && end + 1 < value.length() && value.charAt(end + 1) == '\n') {
					end++;
				}
				end++;
			} else if (end < value.length() && value.charAt(end) == ' ') {
				end++;
			}
			if (end == start) {
				end++;
			}
			start = end;
		}
		return y;
	}

	private static int row(Graphics graphics) {
		return graphics.getFont().getHeight() + 6;
	}

	private static int scroll(Displayable displayable) {
		if (displayable instanceof Form) {
			return ((Form) displayable).scroll;
		}
		if (displayable instanceof List) {
			return ((List) displayable).scroll;
		}
		return 0;
	}

	private static void scroll(Displayable displayable, int value) {
		if (displayable instanceof Form) {
			((Form) displayable).scroll = value;
		} else if (displayable instanceof List) {
			((List) displayable).scroll = value;
		}
	}

	private static Command command(Displayable displayable, boolean left) {
		Command[] slots = bars(displayable);
		if (left) {
			return slots[0] != null ? slots[0] : slots[1];
		}
		return slots[1] != null ? slots[1] : slots[0];
	}

	private static Command[] bars(Displayable displayable) {
		Command left = null;
		Command right = null;
		Command extra = null;
		int leftRank = Integer.MAX_VALUE;
		int rightRank = Integer.MAX_VALUE;
		int extraRank = Integer.MAX_VALUE;
		for (int index = 0; index < displayable.commands.size(); index++) {
			Command command = displayable.commands.get(index);
			if (negative(command)) {
				if (command.getPriority() < rightRank) {
					right = command;
					rightRank = command.getPriority();
				}
			} else if (command.getPriority() < leftRank) {
				extra = left;
				extraRank = leftRank;
				left = command;
				leftRank = command.getPriority();
			} else if (command.getPriority() < extraRank) {
				extra = command;
				extraRank = command.getPriority();
			}
		}
		if (right == null) {
			right = extra;
		}
		if (left == null && right == null && displayable instanceof Alert) {
			right = Alert.DISMISS_COMMAND;
		}
		return new Command[] { left, right };
	}

	private static boolean negative(Command command) {
		int type = command.getCommandType();
		return type == Command.BACK || type == Command.CANCEL || type == Command.EXIT || type == Command.STOP;
	}

	private static String label(Command command) {
		String text = command.getLabel();
		if (text == null || text.length() == 0) {
			return "OK";
		}
		return text;
	}

	private static String fit(Graphics graphics, String value, int width) {
		if (value == null) {
			return "";
		}
		Font font = graphics.getFont();
		if (font.stringWidth(value) <= width) {
			return value;
		}
		String shown = value;
		while (shown.length() > 1 && font.stringWidth(shown + "..") > width) {
			shown = shown.substring(0, shown.length() - 1);
		}
		return shown + "..";
	}

	private static String kind(AlertType type) {
		if (type == AlertType.INFO) {
			return "Info";
		}
		if (type == AlertType.WARNING) {
			return "Warning";
		}
		if (type == AlertType.ERROR) {
			return "Error";
		}
		if (type == AlertType.ALARM) {
			return "Alarm";
		}
		if (type == AlertType.CONFIRMATION) {
			return "Confirm";
		}
		return null;
	}
}
