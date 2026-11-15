# Research on mods

## Restricts

- No java.io.File
- No reflection
- No application class loader
- Class.getResourceAsStream is only for files baked into jar
- Heap: 2MB
- Max JAR: 1MB

But! 1MB is only for the jar

FileConnection has no file-size cap anywhere near 10MB

## FileConnection

jad / manifest:

```txt
MIDlet-Permission-Opt: javax.microedition.io.Connector.file.read
```

Check:

```java
System.getProperty("microedition.io.file.FileConnection.version")
// If null - no file API
```

Scan:

1. fileconn.dir.memorycard - memory card
2. fileconn.dir.roots via FileSystemRegistry.listRoots() - fallback
3. fileconn.dir.private - MIDlet private

Read API:

1. fileSize
2. openInputStream
3. exists
4. isDirectory
5. canRead
6. list
7. openDataInputStream
8. lastModified
9. getName
10. getPath
11. getURL
12. close
13. read
14. DataInputStream
15. ByteArrayInputStream
16. availableSize
