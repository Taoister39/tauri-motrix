use std::{collections::HashMap, fmt, fs::read_to_string};

use anyhow::{bail, Result};
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

        Self::parse_config(&str, &mut map);
        let aria2_instance = Self(map);
        let _ = Self::save_file(&aria2_instance);
        aria2_instance
    }

    fn parse_config(content: &str, map: &mut HashMap<String, String>) {
        for line in content.lines() {
            if line.starts_with('#') || line.is_empty() {
                continue;
            }

            if let Some((key, value)) = line.split_once('=') {
                map.insert(key.trim().to_string(), value.trim().to_string());
            }
        }
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

        map.insert("max-concurrent-downloads".into(), "5".into());
        map.insert("seed-ratio".into(), "1".into());
        map.insert("seed-time".into(), "60".into());

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
            server: Self::guard_server(config),
            secret: config.get("rpc-secret").cloned().unwrap_or_default(),
        }
    }

    pub fn patch_rpc(&mut self, port: u16, secret: String) -> Result<()> {
        if port < 1024 {
            bail!("RPC port must be between 1024 and 65535");
        }
        if secret.contains(['\r', '\n', '\0']) || secret.trim() != secret {
            bail!("RPC secret must not contain line breaks or leading/trailing whitespace");
        }
        self.0.insert("rpc-listen-port".into(), port.to_string());
        if secret.is_empty() {
            self.0.remove("rpc-secret");
        } else {
            self.0.insert("rpc-secret".into(), secret);
        }
        Ok(())
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
    pub secret: String,
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
                server: "127.0.0.1:2239".into(),
                secret: String::new(),
            }
        );
    }

    #[test]
    fn test_guard_port() {
        let mut map: HashMap<String, String> = HashMap::new();
        map.insert("rpc-listen-port".into(), "1234".into());

        assert_eq!(IAria2Temp::guard_port(&map), 1234);
    }

    #[test]
    fn rpc_settings_round_trip() {
        let mut config = IAria2Temp::default();
        config.patch_rpc(6800, "secret=with=equals".into()).unwrap();
        let mut map = HashMap::new();
        IAria2Temp::parse_config(&config.to_string(), &mut map);
        assert_eq!(
            IAria2Temp(map).get_client_info(),
            Aria2Info {
                port: 6800,
                server: "127.0.0.1:6800".into(),
                secret: "secret=with=equals".into(),
            }
        );
        config.patch_rpc(65535, String::new()).unwrap();
        assert_eq!(config.get_client_info().secret, "");
        assert!(!config.to_string().contains("rpc-secret="));
    }

    #[test]
    fn invalid_rpc_settings_do_not_change_config() {
        let mut config = IAria2Temp::default();
        for (port, secret) in [
            (0, ""),
            (1023, ""),
            (6800, "secret\nrpc-listen-all=true"),
            (6800, " secret "),
        ] {
            assert!(config.patch_rpc(port, secret.into()).is_err());
            assert!(config.0.is_empty());
        }
    }
}
