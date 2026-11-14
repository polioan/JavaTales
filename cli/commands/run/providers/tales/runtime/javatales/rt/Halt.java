package javatales.rt;

public final class Halt {
	private Halt() {}

	public static void exit(int code) {
		throw new RuntimeException("exit " + code);
	}
}
