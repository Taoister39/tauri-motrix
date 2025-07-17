#!/bin/bash -e

work_dir=$PWD
aria2_ver="1.37.0"
arch=$(uname -m) # x86_64 or arm64

# Set flags for Homebrew dependencies
export PKG_CONFIG_PATH="$(brew --prefix)/opt/libssh2/lib/pkgconfig:$(brew --prefix)/opt/c-ares/lib/pkgconfig:$(brew --prefix)/opt/sqlite3/lib/pkgconfig:$(brew --prefix)/opt/zlib/lib/pkgconfig:$(brew --prefix)/opt/gmp/lib/pkgconfig:$(brew --prefix)/opt/expat/lib/pkgconfig"
export CPPFLAGS="-I$(brew --prefix)/opt/gettext/include -I$(brew --prefix)/opt/libssh2/include -I$(brew --prefix)/opt/c-ares/include -I$(brew --prefix)/opt/sqlite3/include -I$(brew --prefix)/opt/zlib/include -I$(brew --prefix)/opt/gmp/include -I$(brew --prefix)/opt/expat/include"
export LDFLAGS="-L$(brew --prefix)/opt/gettext/lib -L$(brew --prefix)/opt/libssh2/lib -L$(brew --prefix)/opt/c-ares/lib -L$(brew --prefix)/opt/sqlite3/lib -L$(brew --prefix)/opt/zlib/lib -L$(brew --prefix)/opt/gmp/lib -L$(brew --prefix)/opt/expat/lib"
export ARIA2_STATIC=yes

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

# On Apple Silicon, gmp may need a hint
if [ "$arch" == "arm64" ]; then
    ./configure --with-libgmp --with-libssh2 --without-libxml2 --with-libexpat --with-sqlite3 --with-libcares
else
    ./configure --with-libssh2 --without-libxml2 --with-libexpat --with-sqlite3 --with-libcares
fi

make -j$(sysctl -n hw.ncpu)
pushd src
strip aria2c
7z a aria2-${aria2_ver}-macos-${arch}.zip aria2c
mv aria2-${aria2_ver}-macos-${arch}.zip $work_dir
popd
make clean
