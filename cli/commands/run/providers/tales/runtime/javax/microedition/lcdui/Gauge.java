package javax.microedition.lcdui;

public class Gauge extends Item {
	public static final int INDEFINITE = -1;
	public static final int CONTINUOUS_IDLE = 0;
	public static final int INCREMENTAL_IDLE = 1;
	public static final int CONTINUOUS_RUNNING = 2;
	public static final int INCREMENTAL_UPDATING = 3;

	private final boolean interactive;
	private int max;
	private int value;

	public Gauge(String label, boolean interactive, int maxValue, int initialValue) {
		super(label);
		this.interactive = interactive;
		setMaxValue(maxValue);
		setValue(initialValue);
	}

	public void setValue(int value) {
		if (max == INDEFINITE) {
			if (value != CONTINUOUS_IDLE && value != INCREMENTAL_IDLE && value != CONTINUOUS_RUNNING && value != INCREMENTAL_UPDATING) {
				throw new IllegalArgumentException("value");
			}
		} else if (value < 0 || value > max) {
			throw new IllegalArgumentException("value");
		}
		this.value = value;
		changed();
	}

	public int getValue() {
		return value;
	}

	public void setMaxValue(int maxValue) {
		if (interactive && maxValue <= 0) {
			throw new IllegalArgumentException("max");
		}
		if (!interactive && maxValue != INDEFINITE && maxValue < 0) {
			throw new IllegalArgumentException("max");
		}
		max = maxValue;
		if (max == INDEFINITE) {
			value = CONTINUOUS_IDLE;
		} else if (value > max) {
			value = max;
		}
		changed();
	}

	public int getMaxValue() {
		return max;
	}

	public boolean isInteractive() {
		return interactive;
	}

	void nudge(int delta) {
		if (!interactive || max <= 0) {
			return;
		}
		int next = value + delta;
		if (next < 0) {
			next = 0;
		}
		if (next > max) {
			next = max;
		}
		if (next != value) {
			value = next;
			notifyStateChanged();
			changed();
		}
	}
}
