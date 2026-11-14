package javax.microedition.media;

import java.io.InputStream;
import javax.microedition.media.control.VolumeControl;

public class Player {
	public static final int CLOSED = 0;
	public static final int UNREALIZED = 100;
	public static final int REALIZED = 200;
	public static final int PREFETCHED = 300;
	public static final int STARTED = 400;

	private static int nextId = 1;

	private int state = UNREALIZED;
	private final int id;
	private final byte[] data;
	private int loops = 1;
	private int level = 100;

	private final VolumeControl volume = new VolumeControl() {
		public int setLevel(int value) {
			if (value < 0) {
				value = 0;
			} else if (value > 100) {
				value = 100;
			}
			level = value;
			javatales.rt.Bridge.midiVolume(id, value);
			return value;
		}
	};

	Player(byte[] data) {
		this.data = data;
		this.id = nextId++;
	}

	public void prefetch() {
		state = PREFETCHED;
	}

	public void realize() {
		state = REALIZED;
	}

	public void start() {
		if (state == CLOSED || state == STARTED) {
			return;
		}
		state = STARTED;
		javatales.rt.Bridge.playMidi(id, data, loops, level);
	}

	public void stop() {
		if (state == STARTED) {
			javatales.rt.Bridge.stopMidi(id);
		}
		if (state != CLOSED) {
			state = PREFETCHED;
		}
	}

	public void deallocate() {
		if (state == STARTED) {
			javatales.rt.Bridge.stopMidi(id);
		}
		if (state != CLOSED) {
			state = REALIZED;
		}
	}

	public void close() {
		javatales.rt.Bridge.closeMidi(id);
		state = CLOSED;
	}

	public int getState() {
		return state;
	}

	public void setLoopCount(int count) {
		loops = count;
		javatales.rt.Bridge.midiLoop(id, count);
	}

	public Control getControl(String type) {
		if ("VolumeControl".equals(type)) {
			return volume;
		}
		return null;
	}

	public static Player open(InputStream stream, String type) throws java.io.IOException {
		java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
		byte[] buffer = new byte[512];
		int count;
		while ((count = stream.read(buffer)) >= 0) {
			out.write(buffer, 0, count);
		}
		return new Player(out.toByteArray());
	}
}
