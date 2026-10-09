use std::ffi::OsStr;

pub const AUTOSTART_ARG: &str = "--autostart";

/// Identify OS autostart launches independently of the user's window preference.
pub fn is_autostart(args: impl IntoIterator<Item = impl AsRef<OsStr>>) -> bool {
    args.into_iter().any(|arg| arg.as_ref() == AUTOSTART_ARG)
}

#[cfg(test)]
mod tests {
    use super::{is_autostart, AUTOSTART_ARG};

    #[test]
    fn detects_autostart_among_other_arguments() {
        assert!(is_autostart([AUTOSTART_ARG]));
        assert!(is_autostart(["--other", AUTOSTART_ARG]));
    }

    #[test]
    fn manual_launch_does_not_match_similar_arguments() {
        assert!(!is_autostart(Vec::<String>::new()));
        assert!(!is_autostart(["--other", "--autostart=false"]));
    }
}
