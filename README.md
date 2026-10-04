# tauri-motrix

[![Feature Requests](https://img.shields.io/github/issues/taoister39/tauri-motrix/feature-request.svg)](https://github.com/taoister39/tauri-motrix/issues?q=is%3Aopen+is%3Aissue+label%3Afeature-request+sort%3Areactions-%2B1-desc)
[![Bugs](https://img.shields.io/github/issues/taoister39/tauri-motrix/bug.svg)](https://github.com/taoister39/tauri-motrix/issues?utf8=✓&q=is%3Aissue+is%3Aopen+label%3Abug)

Tauri Motrix is a full-featured download manager written in Tauri.The purpose is to restructure [Motrix](https://github.com/agalwood/Motrix) open source project.

## Preview

| Dark                             | Light                             |
| -------------------------------- | --------------------------------- |
| ![预览](./docs/preview_dark.png) | ![预览](./docs/preview_light.png) |

## Install

Go to the [release page](https://github.com/Taoister39/tauri-motrix/releases) to download the corresponding installation package
Supports Windows (x64 / arm64).

## Features

- 🎨 Material Design Theme (MUI).
- 🚀 Supports 128 threads in a single task
- 📦 Lightweight, small package size
- 🚥 Supports speed limit

## Development

To run the development server, execute the following commands after all prerequisites for Tauri are installed:

> [!NOTE]
>
> **If you are using a Windows ARM or Linux ARM device, you need to install [LLVM](https://github.com/llvm/llvm-project/releases) (including clang) and set the environment variable.**
>
> This is because the `ring` crate is compiled using `clang` on Windows ARM and Linux ARM platforms.
> See this [PR](https://github.com/briansmith/ring/pull/2216) for the ongoing work to replace cl.exe with clang-cl.

```Powershell
pnpm i
pnpm check
pnpm tauri dev
```

## Contributions

Issue and PR welcome!

## Acknowledgements

Thanks to the following projects for giving me inspiration and reference:

- [Clash Verge](https://github.com/clash-verge-rev)
- [Motrix](https://github.com/agalwood/Motrix)
- [aria2](https://github.com/aria2/aria2)
- [antd](https://github.com/ant-design/ant-design)
- [rc-util](https://github.com/react-component/util)
- [stylex-swc-plugin](https://github.com/Dwlad90/stylex-swc-plugin)

## License

GPL-3.0 License. See [License here](./LICENSE) for details.
