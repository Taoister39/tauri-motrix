use std::{collections::HashMap, fmt, fs::read_to_string};

use anyhow::Result;
use serde::Serialize;

use crate::utils::{
    dirs::{self, aria2_download_session_path, aria2_path, path_to_str, user_downloads_dir},
    help::simple_save_file,
};

#[derive(Debug, Default, Clone, Serialize)]
pub struct IAria2Temp(pub HashMap<String, String>);

impl IAria2Temp {
    pub fn new() -> Self {
        let aria2_path = aria2_path().unwrap();

        if !aria2_path.exists() {
            return Self::template();
        }

        let aria2_path = path_to_str(&aria2_path).unwrap();

        let str = read_to_string(aria2_path).unwrap();
        let template = Self::template();
        let mut map = template.0;

        let mut is_changed = false;
        for line in str.lines() {
            if line.starts_with('#') || line.is_empty() {
                continue;
            }

            let mut split = line.split('=');
            let key = split.next().unwrap().trim().to_string();
            let value = split.next().unwrap().trim().to_string();

            map.insert(key, value);
            is_changed = true;
        }

        let aria2_instance = Self(map);

        if is_changed {
            let _ = Self::save_file(&aria2_instance);
        }

        aria2_instance
    }

    pub fn template() -> Self {
        let mut map = HashMap::new();

        map.insert("enable-rpc".into(), "true".into());
        map.insert("rpc-allow-origin-all".into(), "true".into());
        map.insert("rpc-listen-all".into(), "true".into());
        map.insert("rpc-listen-port".into(), "16801".into());

        let save_session = aria2_download_session_path().unwrap();
        let save_session = path_to_str(&save_session).unwrap();

        map.insert("save-session".into(), save_session.into());
        map.insert("input-file".into(), save_session.into());

        // File system
        map.insert("save-session-interval".into(), "10".into());
        map.insert("no-file-allocation-limit".into(), "64M".into());
        map.insert("disk-cache".into(), "64M".into());
        map.insert("auto-save-interval".into(), "10".into());

        let download_dir = user_downloads_dir().unwrap();
        let download_dir = path_to_str(&download_dir).unwrap();

        map.insert("max-connection-per-server".into(), "128".into());
        map.insert("split".into(), "128".into());

        map.insert("dir".into(), download_dir.into());

        // bt task
        map.insert("bt-remove-unselected-file".into(), "true".into());
        map.insert("bt-enable-lpd".into(), "true".into());
        map.insert("bt-max-peers".into(), "128".into());
        map.insert("bt-save-metadata".into(), "true".into());
        map.insert("bt-load-saved-metadata".into(), "true".into());

        Self(map)
    }

    pub fn guard_port(config: &HashMap<String, String>) -> u16 {
        let raw_value = config.get("rpc-listen-port");

        let mut port = raw_value
            .and_then(|value| value.parse().ok())
            .unwrap_or(16801);

        if port == 0 {
            port = 16801;
        }

        port
    }

    pub fn guard_server(config: &HashMap<String, String>) -> String {
        let port = Self::guard_port(config);
        format!("127.0.0.1:{}", port)
    }

    pub fn get_client_info(&self) -> Aria2Info {
        let config = &self.0;

        Aria2Info {
            port: Self::guard_port(config),
            // TODO: temporary solution, need to be fixed
            server: Self::guard_server(config),
        }
    }

    pub fn patch_config(&mut self, patch: HashMap<String, String>) {
        for (key, value) in patch.into_iter() {
            self.0.insert(key, value);
        }
    }

    pub fn save_file(&self) -> Result<()> {
        simple_save_file(&dirs::aria2_path()?, &self)
    }
}

impl fmt::Display for IAria2Temp {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        for (k, v) in &self.0 {
            writeln!(f, "{}={}\n", k, v)?;
        }

        Ok(())
    }
}

// expose to web
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct Aria2Info {
    pub port: u16,
    pub server: String,
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use crate::config::Aria2Info;

    use super::IAria2Temp;

    #[test]
    fn test_get_client_info() {
        let mut map = HashMap::new();
        map.insert("rpc-listen-port".into(), "2239".into());
        let aria2 = IAria2Temp(map);

        assert_eq!(
            aria2.get_client_info(),
            Aria2Info {
                port: 2239,
                server: "127.0.0.1:2239".into()
            }
        );
    }

    #[test]
    fn test_guard_port() {
        let mut map: HashMap<String, String> = HashMap::new();
        map.insert("rpc-listen-port".into(), "1234".into());

        assert_eq!(IAria2Temp::guard_port(&map), 1234);
    }
}
