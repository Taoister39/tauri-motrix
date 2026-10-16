use std::{ffi::c_void, mem::size_of, os::windows::ffi::OsStrExt, path::Path};

use windows::{
    core::PCWSTR,
    Win32::{
        Foundation::SIZE,
        Graphics::Gdi::{
            CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits, GetObjectW, BITMAP, BITMAPINFO,
            BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HBITMAP, HDC,
        },
        System::Com::{CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED},
        UI::Shell::{IShellItemImageFactory, SHCreateItemFromParsingName, SIIGBF_RESIZETOFIT},
    },
};

use super::THUMBNAIL_SIZE;

struct Apartment;

impl Drop for Apartment {
    fn drop(&mut self) {
        unsafe { CoUninitialize() };
    }
}

struct Bitmap(HBITMAP);

impl Drop for Bitmap {
    fn drop(&mut self) {
        unsafe {
            let _ = DeleteObject(self.0.into());
        }
    }
}

struct DeviceContext(HDC);

impl Drop for DeviceContext {
    fn drop(&mut self) {
        unsafe {
            let _ = DeleteDC(self.0);
        }
    }
}

pub(super) fn generate(path: &Path) -> Option<Vec<u8>> {
    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED).ok().ok()?;
        let _apartment = Apartment;
        let wide: Vec<u16> = path
            .as_os_str()
            .encode_wide()
            .map(|unit| {
                if unit == u16::from(b'/') {
                    u16::from(b'\\')
                } else {
                    unit
                }
            })
            .chain(Some(0))
            .collect();
        let factory: IShellItemImageFactory =
            SHCreateItemFromParsingName(PCWSTR(wide.as_ptr()), None).ok()?;
        let bitmap = Bitmap(
            factory
                .GetImage(
                    SIZE {
                        cx: THUMBNAIL_SIZE as i32,
                        cy: THUMBNAIL_SIZE as i32,
                    },
                    SIIGBF_RESIZETOFIT,
                )
                .ok()?,
        );
        let mut object = BITMAP::default();
        if GetObjectW(
            bitmap.0.into(),
            size_of::<BITMAP>() as i32,
            Some(&mut object as *mut _ as *mut c_void),
        ) == 0
        {
            return None;
        }
        let width = u32::try_from(object.bmWidth).ok()?;
        let height = object.bmHeight.unsigned_abs();
        if width == 0 || height == 0 || width > THUMBNAIL_SIZE || height > THUMBNAIL_SIZE {
            return None;
        }
        let context = DeviceContext(CreateCompatibleDC(None));
        if context.0.is_invalid() {
            return None;
        }
        let mut info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width as i32,
                biHeight: -(height as i32),
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            },
            ..Default::default()
        };
        let mut pixels = vec![0u8; width as usize * height as usize * 4];
        if GetDIBits(
            context.0,
            bitmap.0,
            0,
            height,
            Some(pixels.as_mut_ptr().cast()),
            &mut info,
            DIB_RGB_COLORS,
        ) != height as i32
        {
            return None;
        }
        let opaque = pixels.chunks_exact(4).all(|pixel| pixel[3] == 0);
        for pixel in pixels.chunks_exact_mut(4) {
            pixel.swap(0, 2);
            if opaque {
                pixel[3] = 255;
            } else if pixel[3] != 0 {
                let alpha = u32::from(pixel[3]);
                for channel in &mut pixel[..3] {
                    *channel = ((u32::from(*channel) * 255 + alpha / 2) / alpha).min(255) as u8;
                }
            }
        }
        let mut bytes = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut bytes, width, height);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            encoder
                .write_header()
                .ok()?
                .write_image_data(&pixels)
                .ok()?;
        }
        Some(bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shell_prefers_content_thumbnails_and_falls_back_to_file_icons() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("picture with spaces.png");
        {
            let file = std::fs::File::create(&path).unwrap();
            let mut encoder = png::Encoder::new(file, 8, 4);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            encoder
                .write_header()
                .unwrap()
                .write_image_data(&[255; 8 * 4 * 4])
                .unwrap();
        }
        let image = generate(&path).expect("Windows should provide PNG thumbnails");
        let reader = png::Decoder::new(image.as_slice()).read_info().unwrap();
        assert!(reader.info().width <= THUMBNAIL_SIZE);
        assert_eq!(reader.info().width, reader.info().height * 2);
        let unsupported = directory.path().join("file.motrix-unsupported-preview");
        std::fs::write(&unsupported, b"unsupported").unwrap();
        let icon = generate(&unsupported).expect("Windows should provide a file-type icon");
        let reader = png::Decoder::new(icon.as_slice()).read_info().unwrap();
        assert_eq!(reader.info().width, reader.info().height);
        assert!(reader.info().width <= THUMBNAIL_SIZE);
    }

    #[test]
    fn executables_use_shell_icons() {
        let executable = std::env::current_exe().unwrap();
        let image = generate(&executable).expect("Executable icons should be available");
        let reader = png::Decoder::new(image.as_slice()).read_info().unwrap();
        assert!(reader.info().width > 0);
        assert!(reader.info().width <= THUMBNAIL_SIZE);
        let forward_slashes = executable.to_str().unwrap().replace('\\', "/");
        assert!(generate(Path::new(&forward_slashes)).is_some());
    }

    #[test]
    fn folders_use_shell_images() {
        let directory = tempfile::tempdir().unwrap();
        assert!(generate(directory.path()).is_some());
    }
}
