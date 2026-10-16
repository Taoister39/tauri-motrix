use std::{
    collections::HashSet,
    ffi::OsString,
    fs::{self, File},
    io::{BufReader, Read},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::mpsc,
    thread,
    time::{Duration, Instant, UNIX_EPOCH},
};

use gdk_pixbuf::Pixbuf;
use gio::prelude::*;
use glib::{KeyFile, KeyFileFlags};
use gtk::prelude::IconThemeExt;
use md5::{Digest, Md5};

use super::{MAX_PNG_BYTES, THUMBNAIL_SIZE};

fn load_png(path: &Path) -> Option<Pixbuf> {
    if fs::metadata(path).ok()?.len() > (MAX_PNG_BYTES * 16) as u64 {
        return None;
    }
    let reader = png::Decoder::new(BufReader::new(File::open(path).ok()?))
        .read_info()
        .ok()?;
    if reader.info().width > 4096 || reader.info().height > 4096 {
        return None;
    }
    Pixbuf::from_file_at_scale(path, THUMBNAIL_SIZE as i32, THUMBNAIL_SIZE as i32, true).ok()
}

fn cached_thumbnail(cache: &Path, uri: &str, modified: u64) -> Option<Pixbuf> {
    let hash = format!("{:x}.png", Md5::digest(uri.as_bytes()));
    for size in ["normal", "large", "x-large", "xx-large"] {
        let path = cache.join("thumbnails").join(size).join(&hash);
        let Some(file) = File::open(&path).ok() else {
            continue;
        };
        if file.metadata().ok()?.len() > (MAX_PNG_BYTES * 16) as u64 {
            continue;
        }
        let Ok(mut reader) = png::Decoder::new(BufReader::new(file)).read_info() else {
            continue;
        };
        if reader.info().width > 1024 || reader.info().height > 1024 {
            continue;
        }
        let mut pixels = vec![0; reader.output_buffer_size()];
        if reader.next_frame(&mut pixels).is_err() || reader.finish().is_err() {
            continue;
        }
        let info = reader.info();
        let matches = |key: &str, value: &str| {
            info.uncompressed_latin1_text
                .iter()
                .any(|entry| entry.keyword == key && entry.text == value)
                || info.compressed_latin1_text.iter().any(|entry| {
                    entry.keyword == key && entry.get_text().is_ok_and(|text| text == value)
                })
                || info.utf8_text.iter().any(|entry| {
                    entry.keyword == key && entry.get_text().is_ok_and(|text| text == value)
                })
        };
        if matches("Thumb::URI", uri) && matches("Thumb::MTime", &modified.to_string()) {
            if let Some(image) = load_png(&path) {
                return Some(image);
            }
        }
    }
    None
}

fn expand_argument(argument: &str, input: &Path, uri: &str, output: &Path) -> Option<OsString> {
    let mut expanded = OsString::new();
    let mut chars = argument.chars();
    while let Some(character) = chars.next() {
        if character != '%' {
            expanded.push(character.to_string());
            continue;
        }
        match chars.next()? {
            'i' => expanded.push(input),
            'u' => expanded.push(uri),
            'o' => expanded.push(output),
            's' => expanded.push(THUMBNAIL_SIZE.to_string()),
            '%' => expanded.push("%"),
            _ => return None,
        }
    }
    Some(expanded)
}

fn run_thumbnailer(command: &mut Command, timeout: Duration) -> bool {
    let Ok(mut child) = command.stdout(Stdio::null()).stderr(Stdio::null()).spawn() else {
        return false;
    };
    let deadline = Instant::now() + timeout;
    loop {
        match child.try_wait() {
            Ok(Some(status)) => return status.success(),
            Ok(None) if Instant::now() < deadline => thread::sleep(Duration::from_millis(20)),
            _ => {
                let _ = child.kill();
                let _ = child.wait();
                return false;
            }
        }
    }
}

fn generate_with_thumbnailers(
    roots: &[PathBuf],
    path: &Path,
    uri: &str,
    mime: &str,
) -> Option<Pixbuf> {
    let directory = tempfile::tempdir().ok()?;
    let output = directory.path().join("preview.png");
    let mut seen = HashSet::new();
    let deadline = Instant::now() + Duration::from_secs(5);
    for root in roots {
        let Ok(entries) = fs::read_dir(root.join("thumbnailers")) else {
            continue;
        };
        let mut entries: Vec<_> = entries.filter_map(Result::ok).collect();
        entries.sort_by_key(|entry| entry.file_name());
        for entry in entries {
            if entry
                .path()
                .extension()
                .is_none_or(|extension| extension != "thumbnailer")
                || !seen.insert(entry.file_name())
            {
                continue;
            }
            let config = KeyFile::new();
            if config
                .load_from_file(entry.path(), KeyFileFlags::NONE)
                .is_err()
            {
                continue;
            }
            let group = "Thumbnailer Entry";
            let Ok(types) = config.string_list(group, "MimeType") else {
                continue;
            };
            if !types.iter().any(|value| value.as_str() == mime) {
                continue;
            }
            if let Ok(program) = config.string(group, "TryExec") {
                if glib::find_program_in_path(program.as_str()).is_none() {
                    continue;
                }
            }
            let Some(arguments) = config
                .string(group, "Exec")
                .ok()
                .and_then(|value| glib::shell_parse_argv(value.as_str()).ok())
                .and_then(|arguments| {
                    arguments
                        .iter()
                        .map(|argument| expand_argument(argument.to_str()?, path, uri, &output))
                        .collect::<Option<Vec<_>>>()
                })
            else {
                continue;
            };
            let Some(program) = arguments.first() else {
                continue;
            };
            let Some(remaining) = deadline.checked_duration_since(Instant::now()) else {
                return None;
            };
            let mut command = Command::new(program);
            command.args(&arguments[1..]);
            if run_thumbnailer(&mut command, remaining) {
                if let Some(image) = load_png(&output) {
                    return Some(image);
                }
            }
            let _ = fs::remove_file(&output);
        }
    }
    None
}

fn content_thumbnail(path: &Path) -> Option<Vec<u8>> {
    let uri = gio::File::for_path(path).uri();
    let modified = fs::metadata(path)
        .ok()?
        .modified()
        .ok()?
        .duration_since(UNIX_EPOCH)
        .ok()?
        .as_secs();
    let image = cached_thumbnail(&glib::user_cache_dir(), &uri, modified).or_else(|| {
        let mut prefix = Vec::new();
        File::open(path)
            .ok()?
            .take(8192)
            .read_to_end(&mut prefix)
            .ok()?;
        let (content_type, _) = gio::content_type_guess(Some(path), &prefix);
        let mime = gio::content_type_get_mime_type(&content_type)?;
        let mut roots = vec![glib::user_data_dir()];
        roots.extend(glib::system_data_dirs());
        generate_with_thumbnailers(&roots, path, &uri, &mime).or_else(|| {
            if !mime.starts_with("image/") {
                return None;
            }
            Pixbuf::from_file_at_scale(path, THUMBNAIL_SIZE as i32, THUMBNAIL_SIZE as i32, true)
                .ok()?
                .apply_embedded_orientation()
        })
    })?;
    image.save_to_bufferv("png", &[]).ok()
}

fn file_icon(path: &Path) -> Option<Vec<u8>> {
    let file = gio::File::for_path(path);
    let icon = file
        .query_info(
            "standard::icon",
            gio::FileQueryInfoFlags::NONE,
            None::<&gio::Cancellable>,
        )
        .ok()?
        .icon()?;
    let icon = gio::prelude::IconExt::to_string(&icon)?.to_string();
    let (sender, receiver) = mpsc::sync_channel(1);
    glib::idle_add_once(move || {
        let filename = (|| {
            if !gtk::is_initialized_main_thread() {
                return None;
            }
            let theme = gtk::IconTheme::default()?;
            let icon = gio::Icon::for_string(&icon).ok()?;
            theme
                .lookup_by_gicon(
                    &icon,
                    THUMBNAIL_SIZE as i32,
                    gtk::IconLookupFlags::FORCE_SIZE,
                )?
                .filename()
        })();
        let _ = sender.try_send(filename);
    });
    let filename = receiver.recv_timeout(Duration::from_secs(2)).ok()??;
    Pixbuf::from_file_at_scale(filename, THUMBNAIL_SIZE as i32, THUMBNAIL_SIZE as i32, true)
        .ok()?
        .save_to_bufferv("png", &[])
        .ok()
}

pub(super) fn generate(path: &Path) -> Option<Vec<u8>> {
    content_thumbnail(path).or_else(|| file_icon(path))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write_png(path: &Path, uri: &str, modified: &str) {
        let mut encoder = png::Encoder::new(File::create(path).unwrap(), 2, 1);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        encoder
            .add_text_chunk("Thumb::URI".into(), uri.into())
            .unwrap();
        encoder
            .add_text_chunk("Thumb::MTime".into(), modified.into())
            .unwrap();
        encoder
            .write_header()
            .unwrap()
            .write_image_data(&[255; 8])
            .unwrap();
    }

    #[test]
    fn cached_thumbnails_require_matching_uri_and_modification_time() {
        let directory = tempfile::tempdir().unwrap();
        let normal = directory.path().join("thumbnails/normal");
        fs::create_dir_all(&normal).unwrap();
        let uri = "file:///tmp/photo%20with%20spaces.png";
        let cached = normal.join(format!("{:x}.png", Md5::digest(uri.as_bytes())));
        write_png(&cached, uri, "42");
        assert!(cached_thumbnail(directory.path(), uri, 42).is_some());
        assert!(cached_thumbnail(directory.path(), uri, 43).is_none());
        write_png(&cached, "file:///tmp/other.png", "42");
        assert!(cached_thumbnail(directory.path(), uri, 42).is_none());
    }

    #[test]
    fn registered_thumbnailers_receive_literal_file_arguments() {
        let directory = tempfile::tempdir().unwrap();
        fs::create_dir(directory.path().join("thumbnailers")).unwrap();
        let input = directory.path().join("photo with spaces;%u.png");
        write_png(&input, "file:///test", "1");
        fs::write(
            directory.path().join("thumbnailers/test.thumbnailer"),
            "[Thumbnailer Entry]\nExec=cp %i %o\nMimeType=image/x-test;\n",
        )
        .unwrap();
        assert!(generate_with_thumbnailers(
            &[directory.path().to_owned()],
            &input,
            &gio::File::for_path(&input).uri(),
            "image/x-test",
        )
        .is_some());
    }

    #[test]
    fn file_uris_and_arguments_preserve_spaces_and_metacharacters() {
        let path = Path::new("/tmp/a b%u;$(command).png");
        let uri = gio::File::for_path(path).uri();
        assert!(uri.contains("a%20b%25u"));
        assert_eq!(
            expand_argument("%i", path, &uri, Path::new("/tmp/out")),
            Some(path.into())
        );
        assert_eq!(
            expand_argument("%u", path, &uri, path),
            Some(OsString::from(uri.as_str()))
        );
        assert!(expand_argument("%x", path, &uri, path).is_none());
    }

    #[test]
    fn missing_thumbnailers_produce_no_preview() {
        let directory = tempfile::tempdir().unwrap();
        assert!(generate_with_thumbnailers(
            &[directory.path().to_owned()],
            Path::new("/tmp/file"),
            "file:///tmp/file",
            "application/octet-stream",
        )
        .is_none());
    }

    #[test]
    fn timed_out_thumbnailers_are_killed_and_reaped() {
        let started = Instant::now();
        assert!(!run_thumbnailer(
            Command::new("sleep").arg("5"),
            Duration::from_millis(30),
        ));
        assert!(started.elapsed() < Duration::from_secs(2));
    }
}
