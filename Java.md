# Develop with so-called Java on old phones

The Nokia 2730 classic (RM-578) as an example

Profile: MIDP 2.1 (JSR 118), CLDC 1.1 (JSR 139)

Screen: 240x320

Java heap: 2MB

Max JAR: 1MB

Extra API: file access (JSR 75), Bluetooth (JSR 82), audio/camera (JSR 135), SMS (JSR 205), 3D (JSR 184), SVG (JSR 226), Nokia UI 1.1

## Java

Nokia 2730 classic (RM-578) runs Java ME MIDlets

Platform: Series 40 5th Edition, Feature Pack 1

Language level is about Java 1.4

No generics, enums, annotations, foreach or reflection

Float and double are allowed (that is the CLDC 1.1 difference)

The standard library is tiny: Vector and Hashtable

No java.io.File, files go through javax.microedition.io.file.FileConnection

A MIDlet is one class that extends javax.microedition.midlet.MIDlet

UI is either high-level screens (Form, List, TextBox) or a Canvas / GameCanvas
