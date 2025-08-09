#!/bin/bash -e
aria2_ver="1.37.0"
libssh2_ver="1.11.1"

help_msg="Usage: ./build.sh [arm64|x64]"
vcpkg_dir=${vcpkg_dir:-$PWD/vcpkg}
llvm_dir=${llvm_dir:-$PWD/llvm-mingw}
work_dir=$PWD
zip_suffix=""

handle_arch() {
    case $1 in
    arm64)
        arch=arm64
        vcpkg_arch=arm64
        TARGET=aarch64-w64-mingw32
        zip_suffix=win-arm64bit-build1
        ;;
    x64)
        arch=x64
        vcpkg_arch=x64
        TARGET=x86_64-w64-mingw32
        zip_suffix=win-64bit-build1
        ;;
    *)
        echo "$help_msg"
        exit 1
        ;;
    esac
    vcpkg_libs_dir="$vcpkg_dir/installed/${vcpkg_arch}-mingw-static-release"

}

if [ $# == 1 ]; then
    handle_arch $1
else
    echo $help_msg
    exit 1
fi

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

./configure --host=$TARGET \
    --without-libxml2 --with-libexpat
make -j$(nproc)
pushd src
$TARGET-strip aria2c.exe
7z a aria2-${aria2_ver}-$zip_suffix.zip aria2c.exe
mv aria2-${aria2_ver}-${zip_suffix}.zip $work_dir
popd
make clean
