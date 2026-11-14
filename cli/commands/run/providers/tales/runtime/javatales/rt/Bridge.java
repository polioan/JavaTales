package javatales.rt;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import org.teavm.jso.JSBody;
import org.teavm.jso.JSFunctor;
import org.teavm.jso.JSObject;
import org.teavm.jso.canvas.CanvasRenderingContext2D;
import org.teavm.jso.dom.html.HTMLCanvasElement;
import org.teavm.jso.dom.html.HTMLDocument;
import org.teavm.jso.typedarrays.Int8Array;

public final class Bridge {
	private Bridge() {}

	public static HTMLCanvasElement blankCanvas(int width, int height) {
		HTMLCanvasElement canvas = (HTMLCanvasElement) HTMLDocument.current().createElement("canvas");
		canvas.setWidth(width);
		canvas.setHeight(height);
		return canvas;
	}

  @JSBody(params = "canvas", script = "return canvas.getContext('2d', { willReadFrequently: true });")
  public static native CanvasRenderingContext2D context(HTMLCanvasElement canvas);

	@JSBody(params = "context", script = "context.imageSmoothingEnabled = false;")
	public static native void crisp(CanvasRenderingContext2D context);

	public static HTMLCanvasElement screen() {
		return (HTMLCanvasElement) HTMLDocument.current().getElementById("screen");
	}

	public static InputStream open(String name) {
		byte[] data = bytes(name);
		if (data == null) {
			return null;
		}
		return new ByteArrayInputStream(data);
	}

	public static HTMLCanvasElement imageByPath(String name) {
		if (name == null) {
			return null;
		}
		if (!name.startsWith("/")) {
			name = "/" + name;
		}
		return imageForPath(name);
	}

	public static HTMLCanvasElement imageByBytes(byte[] data) {
		return imageForBytes(Int8Array.fromJavaArray(data));
	}

	public static void playMidi(int id, byte[] data, int loops, int volume) {
		if (data == null || data.length == 0) {
			return;
		}
		startMidi(id, Int8Array.fromJavaArray(data), loops, volume);
	}

	public static void stopMidi(int id) {
		endMidi(id);
	}

	public static void closeMidi(int id) {
		releaseMidi(id);
	}

	public static void midiVolume(int id, int volume) {
		setMidiVolume(id, volume);
	}

	public static void midiLoop(int id, int count) {
		setMidiLoop(id, count);
	}

	public static void installKeys() {
		bindKeys(new KeyHandler() {
			public void onKey(int code, boolean down) {
				Screen.key(code, down);
			}
		});
	}

	public static String loadSave(String name) {
		return readSave(name);
	}

	public static void storeSave(String name, String value) {
		writeSave(name, value);
	}

	private static byte[] bytes(String name) {
		if (name == null) {
			return null;
		}
		if (!name.startsWith("/")) {
			name = "/" + name;
		}
		Int8Array raw = readRaw(name);
		if (raw == null) {
			return null;
		}
		int length = raw.getLength();
		byte[] data = new byte[length];
		for (int index = 0; index < length; index++) {
			data[index] = raw.get(index);
		}
		return data;
	}

	@JSFunctor
	interface KeyHandler extends JSObject {
		void onKey(int code, boolean down);
	}

	@JSBody(params = {"id", "data", "loops", "volume"}, script = "window.bridge.playMidi(id, data, loops, volume);")
	private static native void startMidi(int id, Int8Array data, int loops, int volume);

	@JSBody(params = "id", script = "window.bridge.stopMidi(id);")
	private static native void endMidi(int id);

	@JSBody(params = "id", script = "window.bridge.closeMidi(id);")
	private static native void releaseMidi(int id);

	@JSBody(params = {"id", "volume"}, script = "window.bridge.midiVolume(id, volume);")
	private static native void setMidiVolume(int id, int volume);

	@JSBody(params = {"id", "count"}, script = "window.bridge.midiLoop(id, count);")
	private static native void setMidiLoop(int id, int count);

	@JSBody(params = "handler", script = "window.bridge.key = handler;")
	private static native void bindKeys(KeyHandler handler);

	@JSBody(params = "name", script = "var bytes = window.bridge.raw[name]; return bytes || null;")
	private static native Int8Array readRaw(String name);

	@JSBody(params = "name", script = "return window.bridge.imagesByPath[name] || null;")
	private static native HTMLCanvasElement imageForPath(String name);

	@JSBody(params = "bytes", script = "var hash = window.bridge.jtHash(bytes); return window.bridge.images[hash] || null;")
	private static native HTMLCanvasElement imageForBytes(Int8Array bytes);

	@JSBody(params = "name", script = "return window.bridge.readSave(name);")
	private static native String readSave(String name);

	@JSBody(params = {"name", "value"}, script = "window.bridge.writeSave(name, value);")
	private static native void writeSave(String name, String value);
}
