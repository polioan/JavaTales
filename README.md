# JavaTales

Bounce Tales code helpers

Goal:

- Explore code and resources
- Make mods and texture packs
- Make ports to different platforms
- Explore bugs and easter eggs
- Make tools for this game
- Provide tools for building Bounce Tales to ancient platforms

Project is Unix-like OS first, but if you use Bash (or even Git Bash) you probably fine ([Tech stack and building](#tech-stack-and-building))

## CLI help

### Usage

java-tales COMMAND [ARGS...]

### Examples

#### Unpack - unpack Bounce Tales jar into readable sources

java-tales unpack --input=./bounce-tales.jar --output=./bounce-tales

Or with force flag if you want to override output directory

java-tales unpack --input=./bounce-tales.jar --output=./bounce-tales --force

#### Check - check if setup for JavaTales correct

java-tales check

#### Pack - pack sources back into jar

java-tales pack --input=./bounce-tales --output=./bounce-tales.jar

#### Midlet - build arbitrary MIDlet

java-tales midlet --input=./hello-world-midlet/src/com/example/HelloMIDlet.java --output=./hello.jar

#### Run - run emulator to test things

java-tales run --input=./bounce-tales.jar

#### level-json - naive level to JSON parser

java-tales level-json --input=./bounce-tales/Levels/level_campaign01.rlef --output=./level.json

#### level-json-to-parallax - level JSON to parallax HTML

java-tales level-json-to-parallax --input=./level.json --output=./level.html

#### compile-self - build CLI into executable

All flags are optional

java-tales compile-self --input=./cli/cli.ts --output=./java-tales --target=darwin-x64

#### Help - get this help

java-tales help

java-tales --help

## Tech stack and building

- Bun and TypeScript - CLI
- Docker / Docker Compose - dependencies (I don't wanna million i386 packages, IDE I don't like or fighting with Java installations)
- HelloOO7 [BounceTools](https://github.com/HelloOO7/BounceTales) and Java - anything else

Bloat, but I have NASA PC, so it's fine - this [recipes](./cli/commands/) can be crafted on Debian based OS anyways

### Run CLI

If Bun installed - https://bun.com/get

```shell
git clone --recursive https://github.com/polioan/JavaTales.git
cd ./JavaTales/
bun ./cli/cli.ts
```

### Build CLI

If Bun installed - https://bun.com/get

```shell
git clone --recursive https://github.com/polioan/JavaTales.git
cd ./JavaTales/
bun ./cli/cli.ts compile-self --input=./cli/cli.ts --output=./java-tales
```

### Build CLI without installing Bun (kinda)

https://bun.com/docs/compiler/executables

```shell
git clone --recursive https://github.com/polioan/JavaTales.git
cd ./JavaTales/
bash ./compile.sh
```

## References and research

- https://github.com/HelloOO7/BounceTales
- [Java](./Java.md)
- https://github.com/zb3/freej2me-web
- https://github.com/polioan/BounceTalesViewer - Bounce Tales levels WEB viewer using this project
- https://github.com/phd051199/phoneME-iOS
- https://github.com/Rosabis/J2meJS
- [Emulator](./cli/commands/run/README.md)
- https://github.com/hex007/freej2me
