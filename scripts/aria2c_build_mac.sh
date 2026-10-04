#!/bin/bash -e

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "Error: This script is designed to run on macOS systems only."
  echo "Current OS: $OSTYPE"
  echo "Please use the appropriate build script for your operating system:"
  echo "  - Linux: ./aria2c_build_linux.sh"
  echo "  - Windows cross-compile (on Linux): ./aria2c_build_win.sh"
  exit 1
fi

work_dir=$PWD
aria2_ver="1.37.0"
arch="${1:-$(uname -m)}"

# Keep archive names in sync with scripts/aria2_helper.mjs.
case "$arch" in
  arm64|aarch64)
    arch=arm64
    zip_suffix=osx-darwin
    ;;
  x64|x86_64)
    arch=x86_64
    zip_suffix=osx-x64-darwin
    ;;
  *)
    echo "Usage: $0 [arm64|x64|x86_64]"
    exit 1
    ;;
esac

# Homebrew dependencies must match the native compiler architecture.
if [ "$arch" != "$(uname -m)" ]; then
  echo "Error: Build $arch on a native $arch macOS runner."
  exit 1
fi

archive="aria2-${aria2_ver}-${zip_suffix}.zip"

# Set flags for Homebrew dependencies
export PKG_CONFIG_PATH="$(brew --prefix)/opt/libssh2/lib/pkgconfig:$(brew --prefix)/opt/c-ares/lib/pkgconfig:$(brew --prefix)/opt/sqlite3/lib/pkgconfig:$(brew --prefix)/opt/zlib/lib/pkgconfig:$(brew --prefix)/opt/gmp/lib/pkgconfig:$(brew --prefix)/opt/expat/lib/pkgconfig"
export CPPFLAGS="-I$(brew --prefix)/opt/gettext/include -I$(brew --prefix)/opt/libssh2/include -I$(brew --prefix)/opt/c-ares/include -I$(brew --prefix)/opt/sqlite3/include -I$(brew --prefix)/opt/zlib/include -I$(brew --prefix)/opt/gmp/include -I$(brew --prefix)/opt/expat/include"
export LDFLAGS="-L$(brew --prefix)/opt/gettext/lib -L$(brew --prefix)/opt/libssh2/lib -L$(brew --prefix)/opt/c-ares/lib -L$(brew --prefix)/opt/sqlite3/lib -L$(brew --prefix)/opt/zlib/lib -L$(brew --prefix)/opt/gmp/lib -L$(brew --prefix)/opt/expat/lib"
export ARIA2_STATIC=yes

# Build aria2
aria2_folder=aria2-${aria2_ver}-${arch}
if [ ! -d "$aria2_folder" ]; then
  git clone https://github.com/aria2/aria2.git "$aria2_folder"
  cd "$aria2_folder"
  git fetch --tags
  git checkout "tags/release-${aria2_ver}"
  git apply "${work_dir}/patches/aria2-fast.patch"
  autoreconf -i
else
  cd "$aria2_folder"
fi

./configure --with-libgmp --with-libssh2 --without-libxml2 --with-libexpat --with-sqlite3 --with-libcares

make -j"$(sysctl -n hw.ncpu)"
pushd src
strip aria2c
lipo -verify_arch "$arch" aria2c
./aria2c --version

# Code signing and notarization
if [ -n "$APPLE_DEVELOPER_ID" ]; then
  echo "Signing the binary..."
  codesign --force --sign "$APPLE_DEVELOPER_ID" --options runtime --timestamp "aria2c"
else
  echo "Code signing secrets not found, skipping signing and notarization."
fi

7z a -tzip "$archive" aria2c

if [ -n "$APPLE_DEVELOPER_ID" ]; then
  echo "Notarizing the archive..."
  xcrun notarytool submit "$archive" --apple-id "$APPLE_ID" --password "$APPLE_APP_SPECIFIC_PASSWORD" --team-id "$APPLE_TEAM_ID" --wait
  # Apple does not support stapling tickets to standalone command-line binaries.
fi

mv "$archive" "$work_dir"
popd
make clean
