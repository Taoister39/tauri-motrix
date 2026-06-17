#!/bin/bash -e

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "Error: This script is designed to run on Linux systems only."
    echo "Current OS: $OSTYPE"
    echo "Please use the appropriate build script for your operating system:"
    echo "  - macOS: ./aria2c_build_mac.sh"
    echo "  - Windows cross-compile (on Linux): ./aria2c_build_win.sh"
    exit 1
fi

work_dir=$PWD
aria2_ver="1.37.0"
arch="${1:-$(uname -m)}" # x86_64 or arm64
zip_suffix=""

# Install dependencies
sudo apt-get update
sudo apt-get install -y build-essential pkg-config libssl-dev libxml2-dev libcppunit-dev autotools-dev autoconf automake libtool autopoint p7zip-full

configure_flags="--with-openssl --without-libxml2"

if [ "$arch" == "arm64" ] || [ "$arch" == "aarch64" ]; then
    zip_suffix="aarch64-linux-build1"
else
    zip_suffix="x64-linux-build1"
fi

# Build aria2
aria2_folder=aria2-${aria2_ver}
if [ ! -d ${aria2_folder} ]; then
    git clone https://github.com/aria2/aria2.git ${aria2_folder}
    cd ${aria2_folder}
    git fetch --tags
    git checkout tags/release-${aria2_ver}
    git apply ${work_dir}/patches/aria2-fast.patch
    autoreconf -i
else
    cd ${aria2_folder}
fi

./configure $configure_flags
make -j$(nproc)
pushd src

strip aria2c
7z a aria2-${aria2_ver}-${zip_suffix}.zip aria2c
mv aria2-${aria2_ver}-${zip_suffix}.zip $work_dir
popd
make clean
