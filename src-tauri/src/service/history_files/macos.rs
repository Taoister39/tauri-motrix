use std::{
    path::Path,
    sync::{mpsc, OnceLock},
    time::Duration,
};

use block2::RcBlock;
use objc2::{
    msg_send,
    rc::{autoreleasepool, Allocated, Retained},
    runtime::{AnyClass, AnyObject},
    AnyThread,
};
use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep, NSWorkspace};
use objc2_core_graphics::CGImage;
use objc2_foundation::{NSBundle, NSDictionary, NSError, NSPoint, NSRect, NSSize, NSString, NSURL};

use super::{MAX_PNG_BYTES, THUMBNAIL_SIZE};

static QUICK_LOOK_AVAILABLE: OnceLock<bool> = OnceLock::new();
const REQUEST_THUMBNAIL: usize = 1 << 2;
const REPRESENTATION_THUMBNAIL: isize = 2;

fn encode_image(image: &CGImage) -> Option<Vec<u8>> {
    unsafe {
        let bitmap = NSBitmapImageRep::initWithCGImage(NSBitmapImageRep::alloc(), image);
        let data = bitmap
            .representationUsingType_properties(NSBitmapImageFileType::PNG, &NSDictionary::new())?;
        if data.length() > MAX_PNG_BYTES {
            return None;
        }
        Some(data.as_bytes_unchecked().to_vec())
    }
}

fn content_thumbnail(path: &Path) -> Option<Vec<u8>> {
    autoreleasepool(|_| unsafe {
        // Loading at runtime preserves launch compatibility on macOS versions before Quick Look Thumbnailing.
        if !*QUICK_LOOK_AVAILABLE.get_or_init(|| {
            NSBundle::bundleWithPath(&NSString::from_str(
                "/System/Library/Frameworks/QuickLookThumbnailing.framework",
            ))
            .is_some_and(|bundle| bundle.load())
        }) {
            return None;
        }
        let request_class = AnyClass::get(c"QLThumbnailGenerationRequest")?;
        let generator_class = AnyClass::get(c"QLThumbnailGenerator")?;
        let url = NSURL::from_file_path(path)?;
        let allocated: Allocated<AnyObject> = msg_send![request_class, alloc];
        let request: Retained<AnyObject> = msg_send![allocated,
            initWithFileAtURL: &*url,
            size: NSSize::new(THUMBNAIL_SIZE as f64, THUMBNAIL_SIZE as f64),
            scale: 1.0_f64,
            representationTypes: REQUEST_THUMBNAIL
        ];
        let (sender, receiver) = mpsc::sync_channel(1);
        let callback = RcBlock::new(move |representation: *mut AnyObject, error: *mut NSError| {
            let image = autoreleasepool(|_| {
                if !error.is_null() {
                    return None;
                }
                let representation = representation.as_ref()?;
                let kind: isize = msg_send![representation, type];
                if kind != REPRESENTATION_THUMBNAIL {
                    return None;
                }
                let image: *const CGImage = msg_send![representation, CGImage];
                encode_image(image.as_ref()?)
            });
            let _ = sender.try_send(image);
        });
        let generator: Retained<AnyObject> = msg_send![generator_class, sharedGenerator];
        let _: () = msg_send![&*generator,
            generateBestRepresentationForRequest: &*request,
            completionHandler: &*callback
        ];
        match receiver.recv_timeout(Duration::from_secs(5)) {
            Ok(image) => image,
            Err(_) => {
                let _: () = msg_send![&*generator, cancelRequest: &*request];
                None
            }
        }
    })
}

pub(super) fn generate(path: &Path) -> Option<Vec<u8>> {
    content_thumbnail(path).or_else(|| {
        autoreleasepool(|_| unsafe {
            let path = NSString::from_str(path.to_str()?);
            let image = NSWorkspace::sharedWorkspace().iconForFile(&path);
            let mut rectangle = NSRect::new(
                NSPoint::new(0.0, 0.0),
                NSSize::new(THUMBNAIL_SIZE as f64, THUMBNAIL_SIZE as f64),
            );
            let image = image.CGImageForProposedRect_context_hints(&mut rectangle, None, None)?;
            encode_image(&image)
        })
    })
}
