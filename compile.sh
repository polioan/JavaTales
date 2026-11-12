#!/usr/bin/env bash
set -euo pipefail

case "$(uname -s)" in
  Linux*)  os=linux ;;
  Darwin*) os=darwin ;;
  MINGW*|MSYS*|CYGWIN*) os=windows ;;
  *) echo "Unsupported OS"; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64|amd64) arch=x64 ;;
  aarch64|arm64) arch=arm64 ;;
  *) echo "Unsupported architecture"; exit 1 ;;
esac

libc=""
if [[ "$os" == linux ]] && ldd --version 2>&1 | grep -qi musl; then
  libc="-musl"
fi

target="bun-${os}-${arch}${libc}"
output="./java-tales"

rm -f "$output"

docker run --rm \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --volume "$PWD:/app" \
  --workdir /app \
  --entrypoint bun \
  oven/bun:1.4.4 \
  ./cli/cli.ts compile-self \
    --input=./cli/cli.ts \
    --output="$output" \
    --target="$target" \
    --force
