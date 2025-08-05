#!/bin/bash -e

work_dir=$PWD
aria2_ver="1.37.0"
arch=$1 # x86_64 or arm64

# Install dependencies
sudo apt-get update
sudo apt-get install -y build-essential pkg-config libssl-dev libxml2-dev libcppunit-dev autotools-dev autoconf automake libtool autopoint p7zip-full

configure_flags="--with-openssl --without-libxml2"

if [ "$arch" == "arm64" ]; then
    sudo apt-get install -y gcc-aarch64-linux-gnu g++-aarch64-linux-gnu
    configure_flags="$configure_flags --host=aarch64-linux-gnu"
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
7z a aria2-${aria2_ver}-linux-${arch}.zip aria2c
mv aria2-${aria2_ver}-linux-${arch}.zip $work_dir
popd
make clean
