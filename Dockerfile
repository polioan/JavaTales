# syntax=docker/dockerfile:1

FROM oven/bun:1.4.4 AS build
WORKDIR /src
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG TARGET=bun-linux-x64
RUN bun ./cli/cli.ts compile-self \
  --input=./cli/cli.ts \
  --output=/out/java-tales \
  --target="${TARGET}" \
  --force
ARG OWNER_UID=0
ARG OWNER_GID=0
RUN chown "${OWNER_UID}:${OWNER_GID}" /out/java-tales

FROM scratch
COPY --from=build /out/java-tales /java-tales
