#!/bin/sh
# Tải PocketBase đúng phiên bản của dự án vào .tools/ (dùng khi dev và chạy e2e).
set -eu
VERSION="0.40.4"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/.tools"

case "$(uname -s)" in
  Darwin) OS=darwin ;;
  Linux) OS=linux ;;
  *) echo "Hệ điều hành chưa hỗ trợ: $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  arm64|aarch64) ARCH=arm64 ;;
  x86_64|amd64) ARCH=amd64 ;;
  *) echo "Kiến trúc chưa hỗ trợ: $(uname -m)" >&2; exit 1 ;;
esac

for cmd in curl unzip shasum; do
  command -v "$cmd" >/dev/null || { echo "Cần cài $cmd" >&2; exit 1; }
done

if [ -x "$DEST/pocketbase" ] && [ "$("$DEST/pocketbase" --version)" = "pocketbase version $VERSION" ]; then
  echo "PocketBase $VERSION đã có ở $DEST"
  exit 0
fi

mkdir -p "$DEST"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
ZIP="pocketbase_${VERSION}_${OS}_${ARCH}.zip"
BASE="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}"
curl -fsSL -o "$TMP/$ZIP" "$BASE/$ZIP"
curl -fsSL -o "$TMP/checksums.txt" "$BASE/checksums.txt"
# Kiểm checksum trước khi chạy binary vừa tải
(cd "$TMP" && grep " $ZIP\$" checksums.txt | shasum -a 256 -c -) >/dev/null || { echo "Sai checksum $ZIP" >&2; exit 1; }
unzip -oq "$TMP/$ZIP" pocketbase -d "$DEST"
chmod +x "$DEST/pocketbase"
"$DEST/pocketbase" --version
