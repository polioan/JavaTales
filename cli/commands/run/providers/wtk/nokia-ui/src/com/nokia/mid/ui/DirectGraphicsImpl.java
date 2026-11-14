package com.nokia.mid.ui;

import javax.microedition.lcdui.Graphics;

final class DirectGraphicsImpl implements DirectGraphics {
    private final Graphics g;

    DirectGraphicsImpl(Graphics g) {
        this.g = g;
    }

    public void fillPolygon(int[] xPoints, int xOffset, int[] yPoints, int yOffset, int nPoints, int argbColor) {
        if (nPoints < 3 || xPoints == null || yPoints == null) {
            return;
        }
        if (((argbColor >>> 24) & 0xff) == 0) {
            return;
        }

        int minX = xPoints[xOffset];
        int maxX = minX;
        int minY = yPoints[yOffset];
        int maxY = minY;
        for (int i = 1; i < nPoints; i++) {
            int x = xPoints[xOffset + i];
            int y = yPoints[yOffset + i];
            if (x < minX) {
                minX = x;
            }
            if (x > maxX) {
                maxX = x;
            }
            if (y < minY) {
                minY = y;
            }
            if (y > maxY) {
                maxY = y;
            }
        }

        int clipLeft = g.getClipX();
        int clipTop = g.getClipY();
        int clipRight = clipLeft + g.getClipWidth() - 1;
        int clipBottom = clipTop + g.getClipHeight() - 1;
        if (minX < clipLeft) {
            minX = clipLeft;
        }
        if (minY < clipTop) {
            minY = clipTop;
        }
        if (maxX > clipRight) {
            maxX = clipRight;
        }
        if (maxY > clipBottom) {
            maxY = clipBottom;
        }
        if (minX > maxX || minY > maxY) {
            return;
        }

        int width = maxX - minX + 1;
        int height = maxY - minY + 1;
        int[] pixels = new int[width * height];
        int[] hits = new int[nPoints];
        for (int y = minY; y <= maxY; y++) {
            int count = intersections(xPoints, xOffset, yPoints, yOffset, nPoints, y, hits);
            sort(hits, count);
            int row = (y - minY) * width;
            for (int i = 0; i + 1 < count; i += 2) {
                int x0 = hits[i];
                int x1 = hits[i + 1];
                if (x0 < minX) {
                    x0 = minX;
                }
                if (x1 > maxX + 1) {
                    x1 = maxX + 1;
                }
                for (int x = x0; x < x1; x++) {
                    pixels[row + (x - minX)] = argbColor;
                }
            }
        }
        g.drawRGB(pixels, 0, width, minX, minY, width, height, true);
    }

    private static int intersections(int[] xPoints, int xOffset, int[] yPoints, int yOffset, int nPoints, int y, int[] hits) {
        int count = 0;
        int previous = nPoints - 1;
        for (int i = 0; i < nPoints; i++) {
            int y1 = yPoints[yOffset + previous];
            int y2 = yPoints[yOffset + i];
            int x1 = xPoints[xOffset + previous];
            int x2 = xPoints[xOffset + i];
            previous = i;
            if (y1 == y2) {
                continue;
            }
            if (y1 > y2) {
                int swap = y1;
                y1 = y2;
                y2 = swap;
                swap = x1;
                x1 = x2;
                x2 = swap;
            }
            if (y < y1 || y >= y2) {
                continue;
            }
            hits[count] = x1 + (int) ((long) (x2 - x1) * (y - y1) / (y2 - y1));
            count++;
        }
        return count;
    }

    private static void sort(int[] values, int count) {
        for (int i = 1; i < count; i++) {
            int value = values[i];
            int j = i;
            while (j > 0 && values[j - 1] > value) {
                values[j] = values[j - 1];
                j--;
            }
            values[j] = value;
        }
    }
}
