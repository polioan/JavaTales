package com.example;

import javax.microedition.lcdui.Command;
import javax.microedition.lcdui.CommandListener;
import javax.microedition.lcdui.Display;
import javax.microedition.lcdui.Displayable;
import javax.microedition.lcdui.Form;
import javax.microedition.midlet.MIDlet;

public class HelloMIDlet extends MIDlet implements CommandListener {
    public void startApp() {
        Form form = new Form("Hello");
        form.append("Hello");
        form.addCommand(new Command("Exit", Command.EXIT, 1));
        form.setCommandListener(this);
        Display.getDisplay(this).setCurrent(form);
    }

    public void pauseApp() {
    }

    public void destroyApp(boolean unconditional) {
    }

    public void commandAction(Command command, Displayable displayable) {
        notifyDestroyed();
    }
}
