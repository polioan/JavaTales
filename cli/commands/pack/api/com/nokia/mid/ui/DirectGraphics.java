package com.nokia.mid.ui;

public interface DirectGraphics {
	public abstract void fillPolygon(
		int[] xPoints,
		int xOffset,
		int[] yPoints,
		int yOffset,
		int nPoints,
		int argbColor
	);
}
