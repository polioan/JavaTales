package javatales.prepare;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import org.objectweb.asm.Attribute;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassVisitor;
import org.objectweb.asm.ClassWriter;
import org.objectweb.asm.MethodVisitor;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.commons.ClassRemapper;
import org.objectweb.asm.commons.Remapper;

public final class Prepare {
	public static void main(String[] args) throws Exception {
		Path game = Path.of(args[0]);
		Path resourcesJs = Path.of(args[1]);
		Path mainJava = Path.of(args[2]);
		List<String> midlets = new ArrayList<String>();
		List<Path> classFiles = new ArrayList<Path>();
		List<byte[]> classBytes = new ArrayList<byte[]>();
		try (Stream<Path> files = Files.walk(game)) {
			for (Path file : (Iterable<Path>) files::iterator) {
				if (!Files.isRegularFile(file) || !file.getFileName().toString().endsWith(".class")) {
					continue;
				}
				byte[] bytes = Files.readAllBytes(file);
				ClassReader reader = new ClassReader(bytes);
				if ("javax/microedition/midlet/MIDlet".equals(reader.getSuperName())) {
					midlets.add(reader.getClassName().replace('/', '.'));
				}
				classFiles.add(file);
				classBytes.add(bytes);
			}
		}
		Renamer renamer = Renamer.of(classBytes);
		int rewritten = 0;
		for (int index = 0; index < classFiles.size(); index++) {
			ClassReader reader = new ClassReader(classBytes.get(index));
			ClassWriter writer = new ClassWriter(0);
			Rewriter rewriter = new Rewriter(writer);
			reader.accept(new ClassRemapper(rewriter, renamer), 0);
			Files.write(classFiles.get(index), writer.toByteArray());
			rewritten += rewriter.rewritten;
		}
		String midlet = manifestMidlet(game.resolve("META-INF/MANIFEST.MF"));
		if (midlet == null) {
			if (midlets.size() == 1) {
				midlet = midlets.get(0);
			} else {
				throw new IllegalStateException("JAR manifest has no MIDlet-1, found " + midlets);
			}
		}
		midlet = resolveMidlet(midlet, midlets);
		writeResources(game, resourcesJs);
		boolean unpackaged = midlet.indexOf('.') < 0;
		String source = (unpackaged ? "" : "package javatales.launch;\n\n")
			+ "public final class Main {\n"
			+ "\tpublic static void main(String[] args) {\n"
			+ "\t\tjavatales.rt.Screen.boot(new " + midlet + "());\n"
			+ "\t}\n"
			+ "}\n";
		Files.writeString(mainJava, source);
		Files.writeString(mainJava.resolveSibling("entry.txt"), unpackaged ? "Main\n" : "javatales.launch.Main\n");
		System.out.println("MIDlet " + midlet + ", rewrote " + rewritten + " resource calls, renamed " + renamer.fields + " fields and " + renamer.methods + " methods");
	}

	private static String resolveMidlet(String manifestName, List<String> midlets) {
		if (manifestName == null) {
			return midlets.get(0);
		}
		if (midlets.contains(manifestName)) {
			return manifestName;
		}
		String suffix = "." + manifestName;
		String match = null;
		for (String name : midlets) {
			if (name.endsWith(suffix)) {
				if (match != null) {
					return manifestName;
				}
				match = name;
			}
		}
		return match == null ? manifestName : match;
	}

	private static void writeResources(Path game, Path output) throws IOException {
		StringBuilder script = new StringBuilder();
		script.append("window.javatalesResources = {\n");
		boolean any = false;
		try (Stream<Path> files = Files.walk(game)) {
			for (Path file : (Iterable<Path>) files::iterator) {
				if (!Files.isRegularFile(file)) {
					continue;
				}
				String name = file.getFileName().toString();
				if (name.endsWith(".class")) {
					continue;
				}
				String path = "/" + game.relativize(file).toString().replace('\\', '/');
				if (any) {
					script.append(",\n");
				}
				any = true;
				script.append('\t').append(quote(path)).append(": ").append(quote(Base64.getEncoder().encodeToString(Files.readAllBytes(file))));
			}
		}
		script.append("\n};\n");
		Files.writeString(output, script.toString());
	}

	private static String manifestMidlet(Path manifest) throws IOException {
		if (!Files.isRegularFile(manifest)) {
			return null;
		}
		String text = Files.readString(manifest, StandardCharsets.ISO_8859_1).replace("\r\n", "\n").replace('\r', '\n');
		StringBuilder current = new StringBuilder();
		String found = null;
		for (String line : text.split("\n", -1)) {
			if (line.startsWith(" ") || line.startsWith("\t")) {
				current.append(line.substring(1));
				continue;
			}
			found = midletFrom(current.toString(), found);
			current.setLength(0);
			current.append(line);
		}
		return midletFrom(current.toString(), found);
	}

	private static String midletFrom(String line, String found) {
		if (found != null || !line.startsWith("MIDlet-1:")) {
			return found;
		}
		String value = line.substring("MIDlet-1:".length()).trim();
		int comma = value.lastIndexOf(',');
		if (comma < 0) {
			return null;
		}
		String name = value.substring(comma + 1).trim();
		return name.isEmpty() ? null : name;
	}

	private static String quote(String text) {
		StringBuilder builder = new StringBuilder(text.length() + 2);
		builder.append('"');
		for (int index = 0; index < text.length(); index++) {
			char character = text.charAt(index);
			switch (character) {
				case '\\':
				case '"':
					builder.append('\\').append(character);
					break;
				case '\n':
					builder.append("\\n");
					break;
				case '\r':
					builder.append("\\r");
					break;
				default:
					builder.append(character);
					break;
			}
		}
		builder.append('"');
		return builder.toString();
	}

	private static final class Renamer extends Remapper {
		private final Map<String, String> fieldNames = new HashMap<String, String>();
		private final Map<String, String> methodNames = new HashMap<String, String>();
		private final Map<String, String> supers = new HashMap<String, String>();
		private final Map<String, List<String>> interfaces = new HashMap<String, List<String>>();
		private final Set<String> declaredFields = new HashSet<String>();
		private final Set<String> declaredMethods = new HashSet<String>();
		int fields;
		int methods;

		static Renamer of(List<byte[]> classes) {
			Map<String, Map<String, Set<String>>> fields = new HashMap<String, Map<String, Set<String>>>();
			Map<String, Map<String, Set<String>>> methods = new HashMap<String, Map<String, Set<String>>>();
			List<String[]> methodList = new ArrayList<String[]>();
			Renamer renamer = new Renamer();
			for (byte[] bytes : classes) {
				ClassReader reader = new ClassReader(bytes);
				String owner = reader.getClassName();
				renamer.supers.put(owner, reader.getSuperName());
				String[] faces = reader.getInterfaces();
				renamer.interfaces.put(owner, faces == null ? new ArrayList<String>() : java.util.Arrays.asList(faces));
				reader.accept(new ClassVisitor(Opcodes.ASM9) {
					@Override
					public org.objectweb.asm.FieldVisitor visitField(int access, String name, String descriptor, String signature, Object value) {
						descriptors(fields, owner, name).add(descriptor);
						renamer.declaredFields.add(key(owner, name, descriptor));
						return null;
					}

					@Override
					public MethodVisitor visitMethod(int access, String name, String descriptor, String signature, String[] exceptions) {
						if (!"<init>".equals(name) && !"<clinit>".equals(name)) {
							descriptors(methods, owner, name).add(descriptor);
							methodList.add(new String[] { owner, name, descriptor });
							renamer.declaredMethods.add(key(owner, name, descriptor));
						}
						return null;
					}
				}, ClassReader.SKIP_CODE);
			}
			for (Map.Entry<String, Map<String, Set<String>>> type : fields.entrySet()) {
				for (Map.Entry<String, Set<String>> name : type.getValue().entrySet()) {
					if (name.getValue().size() < 2) {
						continue;
					}
					for (String descriptor : name.getValue()) {
						renamer.fieldNames.put(key(type.getKey(), name.getKey(), descriptor), name.getKey() + "$" + tag(descriptor) + "$" + tag(type.getKey()));
						renamer.fields++;
					}
				}
			}
			Set<String> overloaded = new HashSet<String>();
			for (Map<String, Set<String>> names : methods.values()) {
				for (Map.Entry<String, Set<String>> name : names.entrySet()) {
					if (name.getValue().size() > 1 && !preserved(name.getKey())) {
						overloaded.add(name.getKey());
					}
				}
			}
			for (String[] method : methodList) {
				if (!overloaded.contains(method[1])) {
					continue;
				}
				renamer.methodNames.put(key(method[0], method[1], method[2]), method[1] + "$" + tag(method[2]));
				renamer.methods++;
			}
			return renamer;
		}

		@Override
		public String mapFieldName(String owner, String name, String descriptor) {
			String mapped = resolve(owner, name, descriptor, fieldNames, declaredFields, false, new HashSet<String>());
			return mapped == null ? name : mapped;
		}

		@Override
		public String mapMethodName(String owner, String name, String descriptor) {
			String mapped = resolve(owner, name, descriptor, methodNames, declaredMethods, true, new HashSet<String>());
			return mapped == null ? name : mapped;
		}

		private String resolve(String owner, String name, String descriptor, Map<String, String> renamed, Set<String> declared, boolean methods, Set<String> seen) {
			if (owner == null || !seen.add(owner)) {
				return null;
			}
			String id = key(owner, name, descriptor);
			String mapped = renamed.get(id);
			if (mapped != null) {
				return mapped;
			}
			if (declared.contains(id)) {
				return name;
			}
			String fromSuper = resolve(supers.get(owner), name, descriptor, renamed, declared, methods, seen);
			if (fromSuper != null) {
				return fromSuper;
			}
			List<String> faces = interfaces.get(owner);
			if (faces != null) {
				for (String face : faces) {
					String fromFace = resolve(face, name, descriptor, renamed, declared, methods, seen);
					if (fromFace != null) {
						return fromFace;
					}
				}
			}
			return null;
		}

		private static boolean preserved(String name) {
			return "run".equals(name)
				|| "startApp".equals(name)
				|| "pauseApp".equals(name)
				|| "destroyApp".equals(name)
				|| "paint".equals(name)
				|| "keyPressed".equals(name)
				|| "keyReleased".equals(name)
				|| "keyRepeated".equals(name)
				|| "showNotify".equals(name)
				|| "hideNotify".equals(name)
				|| "sizeChanged".equals(name)
				|| "commandAction".equals(name)
				|| "pointerPressed".equals(name)
				|| "pointerReleased".equals(name)
				|| "pointerDragged".equals(name);
		}

		private static Set<String> descriptors(Map<String, Map<String, Set<String>>> table, String owner, String name) {
			Map<String, Set<String>> names = table.get(owner);
			if (names == null) {
				names = new HashMap<String, Set<String>>();
				table.put(owner, names);
			}
			Set<String> descriptors = names.get(name);
			if (descriptors == null) {
				descriptors = new HashSet<String>();
				names.put(name, descriptors);
			}
			return descriptors;
		}

		private static String key(String owner, String name, String descriptor) {
			return owner + "." + name + descriptor;
		}

		private static String tag(String value) {
			StringBuilder tag = new StringBuilder();
			for (int index = 0; index < value.length(); index++) {
				char character = value.charAt(index);
				if (character == '[' || character == '(') {
					tag.append('A');
				} else if (character == '/' || character == ';' || character == ')') {
					tag.append('_');
				} else {
					tag.append(character);
				}
			}
			return tag.toString();
		}
	}

	private static final class Rewriter extends ClassVisitor {
		int rewritten;

		Rewriter(ClassVisitor visitor) {
			super(Opcodes.ASM9, visitor);
		}

		@Override
		public MethodVisitor visitMethod(int access, String name, String descriptor, String signature, String[] exceptions) {
			return new MethodVisitor(Opcodes.ASM9, super.visitMethod(access, name, descriptor, signature, exceptions)) {
				@Override
				public void visitAttribute(Attribute attribute) {
					if (!"StackMap".equals(attribute.type)) {
						super.visitAttribute(attribute);
					}
				}

				@Override
				public void visitMethodInsn(int opcode, String owner, String method, String methodDescriptor, boolean interfaceCall) {
					if (opcode == Opcodes.INVOKEVIRTUAL
						&& "java/lang/Class".equals(owner)
						&& "getResourceAsStream".equals(method)
						&& "(Ljava/lang/String;)Ljava/io/InputStream;".equals(methodDescriptor)) {
						visitInsn(Opcodes.SWAP);
						visitInsn(Opcodes.POP);
						super.visitMethodInsn(Opcodes.INVOKESTATIC, "javatales/rt/Resources", "open", methodDescriptor, false);
						rewritten++;
						return;
					}
					if (opcode == Opcodes.INVOKESTATIC
						&& "java/lang/System".equals(owner)
						&& "getProperty".equals(method)
						&& "(Ljava/lang/String;)Ljava/lang/String;".equals(methodDescriptor)) {
						super.visitMethodInsn(Opcodes.INVOKESTATIC, "javatales/rt/Props", "get", methodDescriptor, false);
						rewritten++;
						return;
					}
					if (opcode == Opcodes.INVOKESTATIC
						&& "java/lang/System".equals(owner)
						&& "exit".equals(method)
						&& "(I)V".equals(methodDescriptor)) {
						super.visitMethodInsn(Opcodes.INVOKESTATIC, "javatales/rt/Halt", "exit", methodDescriptor, false);
						rewritten++;
						return;
					}
					super.visitMethodInsn(opcode, owner, method, methodDescriptor, interfaceCall);
				}
			};
		}
	}
}
