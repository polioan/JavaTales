package javax.microedition.rms;

import java.util.HashMap;
import javatales.rt.Bridge;

public class RecordStore {
	private static final HashMap stores = new HashMap();
	private final String name;
	private byte[][] records = new byte[0][];

	private RecordStore(String name) {
		this.name = name;
		String saved = Bridge.loadSave(name);
		if (saved == null || saved.length() == 0) {
			return;
		}
		String[] parts = split(saved);
		records = new byte[parts.length][];
		for (int index = 0; index < parts.length; index++) {
			records[index] = decode(parts[index]);
		}
	}

	public static RecordStore openRecordStore(String name, boolean createIfNecessary) throws RecordStoreException {
		RecordStore store = (RecordStore) stores.get(name);
		if (store != null) {
			return store;
		}
		if (!createIfNecessary && Bridge.loadSave(name) == null) {
			throw new RecordStoreException(name);
		}
		store = new RecordStore(name);
		stores.put(name, store);
		return store;
	}

	public void closeRecordStore() {
		persist();
	}

	public int getNumRecords() {
		return records.length;
	}

	public byte[] getRecord(int id) throws RecordStoreException {
		byte[] record = records[check(id)];
		byte[] copy = new byte[record.length];
		System.arraycopy(record, 0, copy, 0, record.length);
		return copy;
	}

	public int addRecord(byte[] data, int offset, int length) {
		byte[] record = copyOf(data, offset, length);
		byte[][] next = new byte[records.length + 1][];
		System.arraycopy(records, 0, next, 0, records.length);
		next[records.length] = record;
		records = next;
		persist();
		return records.length;
	}

	public void setRecord(int id, byte[] data, int offset, int length) throws RecordStoreException {
		records[check(id)] = copyOf(data, offset, length);
		persist();
	}

	private int check(int id) throws RecordStoreException {
		if (id < 1 || id > records.length) {
			throw new RecordStoreException("record " + id);
		}
		return id - 1;
	}

	private void persist() {
		StringBuilder builder = new StringBuilder();
		for (int index = 0; index < records.length; index++) {
			if (index > 0) {
				builder.append('\n');
			}
			builder.append(encode(records[index]));
		}
		Bridge.storeSave(name, builder.toString());
	}

	private static byte[] copyOf(byte[] data, int offset, int length) {
		if (data == null || length <= 0) {
			return new byte[0];
		}
		byte[] copy = new byte[length];
		System.arraycopy(data, offset, copy, 0, length);
		return copy;
	}

	private static String[] split(String saved) {
		int count = 1;
		for (int index = 0; index < saved.length(); index++) {
			if (saved.charAt(index) == '\n') {
				count++;
			}
		}
		String[] parts = new String[count];
		int start = 0;
		int part = 0;
		for (int index = 0; index <= saved.length(); index++) {
			if (index == saved.length() || saved.charAt(index) == '\n') {
				parts[part++] = saved.substring(start, index);
				start = index + 1;
			}
		}
		return parts;
	}

	private static String encode(byte[] data) {
		StringBuilder builder = new StringBuilder(data.length * 2);
		for (int index = 0; index < data.length; index++) {
			int value = data[index] & 255;
			builder.append(Character.forDigit(value >>> 4, 16));
			builder.append(Character.forDigit(value & 15, 16));
		}
		return builder.toString();
	}

	private static byte[] decode(String text) {
		byte[] data = new byte[text.length() / 2];
		for (int index = 0; index < data.length; index++) {
			int high = Character.digit(text.charAt(index * 2), 16);
			int low = Character.digit(text.charAt(index * 2 + 1), 16);
			data[index] = (byte) ((high << 4) | low);
		}
		return data;
	}
}
