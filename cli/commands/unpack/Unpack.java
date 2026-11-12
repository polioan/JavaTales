package javatales.unpack;

import bouncetools.ResourceDecomposer;
import xstandard.formats.zip.ZipArchive;
import xstandard.fs.FSFile;
import xstandard.fs.accessors.DiskFile;

public final class Unpack {

	private Unpack() {
	}

	public static void main(String[] args) throws Exception {
		if (args.length != 2) {
			throw new IllegalArgumentException("Expected <jar> <output>");
		}

		FSFile source = new DiskFile(args[0]);
    
		if (!ZipArchive.isZip(source)) {
			throw new IllegalArgumentException("Input is not a zip/jar: " + args[0]);
		}

		ResourceDecomposer.decompose(new ZipArchive(source), new DiskFile(args[1]));
	}
}
