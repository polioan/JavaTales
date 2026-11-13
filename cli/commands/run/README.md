# I am not writing my own emulator from scratch bro...

1. https://github.com/zb3/freej2me-web is proprietary and bloated
2. https://github.com/Rosabis/J2meJS is laggy (graphics)
3. https://github.com/phd051199/phoneME-iOS super cool at first, but super high PC resources usage and super laggy-delay controls (at least for me)
4. xpra/fluxbox or just VNC is messy, high on resources and problematic with audio

## And how this solution works

- Unpack jar
- ASM rewrites jar for using with TeaVM
- TeaVM compiles the jar to JavaScript (with old Java runtime bridge written in JavaScript baked in)
- nginx serves the result as a static

## So I did write emulator from scratch...

Kinda

I implemented enough runtime (Java and JavaScript) to smoothly play Bounce Tales

Other MIDP 2.0, CLDC 1.1, Nokia UI API or whatever is not implemented - I am lazy

## Accuracy

Probably not accurate!

### For precise testing I suggest:

(Or use real device like - [Nokia 2730 classic](../../../Java.md))

#### Zulu JDK 8

```dockerfile
ARG ZULU_URL=https://cdn.azul.com/zulu/bin/zulu8.98.0.111-ca-jdk8.0.512-linux_i686.tar.gz
ARG ZULU_SHA256=e286bfe31e9f4d787a58912898b961869721562d7d89048841d011720dd8c18b
```

#### Sun Java Wireless Toolkit (WTK) 2.5.2

```dockerfile
ARG WTK_URL=https://download.oracle.com/otn-pub/java/sun_java_wireless_toolkit/2.5.2_01/sun_java_wireless_toolkit-2.5.2_01-linuxi486.bin.sh
ARG WTK_SHA256=416ea8c8dc56e3563fc92e89bb9dde243662272bc4c88121d8fc1074044b4bb2
RUN tail -c +26625 wtk.bin.sh > wtk.zip
```
