#!/bin/bash -e

work_dir=$PWD
aria2_ver="1.37.0"
arch="${1:-$(uname -m)}" # x86_64 or arm64
zip_suffix=""

# Install dependencies
sudo apt-get update
sudo apt-get install -y build-essential pkg-config libssl-dev libxml2-dev libcppunit-dev autotools-dev autoconf automake libtool autopoint p7zip-full

configure_flags="--with-openssl --without-libxml2"

if [ "$arch" == "arm64" ]; then
    # Install cross-compilation tools and ARM64 libraries
    sudo apt-get install -y gcc-aarch64-linux-gnu g++-aarch64-linux-gnu
    
    # Add ARM64 architecture and install ARM64 libraries
    sudo dpkg --add-architecture arm64
    sudo apt-get update
    sudo apt-get install -y libssl-dev:arm64 libexpat1-dev:arm64 zlib1g-dev:arm64
    
    # Set up cross-compilation environment
    export CC=aarch64-linux-gnu-gcc
    export CXX=aarch64-linux-gnu-g++
    export AR=aarch64-linux-gnu-ar
    export STRIP=aarch64-linux-gnu-strip
    export PKG_CONFIG=aarch64-linux-gnu-pkg-config
    export PKG_CONFIG_PATH=/usr/lib/aarch64-linux-gnu/pkgconfig:/usr/share/pkgconfig
    export PKG_CONFIG_LIBDIR=/usr/lib/aarch64-linux-gnu/pkgconfig:/usr/share/pkgconfig
    
    configure_flags="$configure_flags --host=aarch64-linux-gnu"
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
# Use the appropriate strip command for the target architecture
if [ "$arch" == "arm64" ]; then
    aarch64-linux-gnu-strip aria2c
else
    strip aria2c
fi
7z a aria2-${aria2_ver}-${zip_suffix}.zip aria2c
mv aria2-${aria2_ver}-${zip_suffix}.zip $work_dir
popd
make clean
