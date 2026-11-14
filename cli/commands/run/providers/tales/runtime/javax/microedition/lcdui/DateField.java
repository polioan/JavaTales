package javax.microedition.lcdui;

import java.util.Date;
import java.util.TimeZone;

public class DateField extends Item {
	public static final int DATE = 1;
	public static final int TIME = 2;
	public static final int DATE_TIME = 3;

	private int mode;
	private Date date;
	private final TimeZone zone;

	public DateField(String label, int mode) {
		this(label, mode, TimeZone.getDefault());
	}

	public DateField(String label, int mode, TimeZone timeZone) {
		super(label);
		if (timeZone == null) {
			throw new NullPointerException("zone");
		}
		this.zone = timeZone;
		setInputMode(mode);
	}

	public Date getDate() {
		return date == null ? null : new Date(date.getTime());
	}

	public void setDate(Date date) {
		this.date = date == null ? null : new Date(date.getTime());
		changed();
	}

	public int getInputMode() {
		return mode;
	}

	public void setInputMode(int mode) {
		if (mode != DATE && mode != TIME && mode != DATE_TIME) {
			throw new IllegalArgumentException("mode");
		}
		this.mode = mode;
		changed();
	}

	String shown() {
		if (date == null) {
			return "";
		}
		return date.toString();
	}

	TimeZone zone() {
		return zone;
	}
}
