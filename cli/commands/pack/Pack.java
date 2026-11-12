package javatales.pack;

import bouncetools.ResourceComposer;
import xstandard.fs.accessors.DiskFile;

public final class Pack {

	private Pack() {
	}

	public static void main(String[] args) throws Exception {
		if (args.length != 1) {
			throw new IllegalArgumentException("Expected <unpacked directory>");
		}

		ResourceComposer.compose(new DiskFile(args[0]));
	}
}
