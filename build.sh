#!/bin/bash -e

help_msg="Usage: ./build.sh [arm32|arm64]"

[ -z "$vcpkg_dir" ] && vcpkg_dir=$PWD/vcpkg
[ -z "$llvm_dir" ] && llvm_dir=$PWD/llvm-mingw
work_dir=$PWD

if [ $# == 1 ]; then
    if [ $1 == "arm32" ]; then
        arch=arm32
        vcpkg_arch=arm
        vcpkg_libs_dir=$vcpkg_dir/installed/arm-mingw-static-release
        TARGET=armv7-w64-mingw32
    elif [ $1 == "arm64" ]; then
        arch=arm64
        vcpkg_arch=arm64
        vcpkg_libs_dir=$vcpkg_dir/installed/arm64-mingw-static-release
        TARGET=aarch64-w64-mingw32
    else
        echo $help_msg
        exit -1
    fi
else
    echo $help_msg
    exit -1
fi

aria2_ver="1.37.0"
libssh2_ver="1.11.1"
export PATH=$PATH:$llvm_dir/bin
export PKG_CONFIG_PATH=$vcpkg_dir/installed/$vcpkg_arch-mingw-static-release/lib/pkgconfig:$work_dir/libssh2-$arch/lib/pkgconfig
export ARIA2_STATIC=yes
export CPPFLAGS="-I$vcpkg_dir/installed/$vcpkg_arch-mingw-static-release/include"
export LDFLAGS="-L$vcpkg_dir/installed/$vcpkg_arch-mingw-static-release/lib"

# Install libssh2
wget -nc https://www.libssh2.org/download/libssh2-${libssh2_ver}.tar.gz
tar xf libssh2-${libssh2_ver}.tar.gz
pushd libssh2-${libssh2_ver}
autoreconf -fi
./configure --disable-debug --disable-shared --enable-static \
--prefix=$work_dir/libssh2-$arch --host=$TARGET \
--without-openssl --with-wincng
make install
make clean
popd

# Build aria2
wget -nc https://github.com/aria2/aria2/releases/download/release-${aria2_ver}/aria2-${aria2_ver}.tar.xz
tar xf aria2-${aria2_ver}.tar.xz
cd aria2-${aria2_ver}
./configure --host=$TARGET  \
--without-libxml2 --with-libexpat
make -j$(nproc)
pushd src
$TARGET-strip aria2c.exe
7z a aria2-${aria2_ver}-win$arch.zip aria2c.exe
mv aria2-${aria2_ver}-win$arch.zip $work_dir
popd
make clean