use anyhow::Result;
use serde::{Deserialize, Serialize};

use crate::{
    logging,
    service::i18n,
    utils::{dirs, help, logging::Type},
};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct IMotrix {
    /// aria2c run name for sidecar
    pub aria2_engine: Option<String>,

    // i18n
    pub language: Option<String>,

    /// app log level
    /// silent | error | warn | info | debug | trace
    pub app_log_level: Option<String>,

    /// `light` or `dark` or `system`
    pub theme_mode: Option<String>,
    /// 0 -> no clear
    /// 1 -> 7 day
    /// 2 -> 30 day
    /// 3 -> 90 day
    pub auto_log_clean: Option<i32>,

    pub enable_auto_launch: Option<bool>,

    pub auto_check_update: Option<bool>,

    pub auto_resume_all: Option<bool>,

    pub new_task_show_downloading: Option<bool>,

    pub task_completed_notify: Option<bool>,

    pub no_confirm_before_delete_task: Option<bool>,
    /// to fetch tracker server
    /// TODO: migrate config center
    pub tracker_source: Option<Vec<String>>,

    pub bt_listen_port: Option<u16>,
    pub dht_listen_port: Option<u16>,
    pub enable_upnp: Option<bool>,
}

impl IMotrix {
    pub fn new() -> Self {
        let template = Self::template();

        match dirs::motrix_path().and_then(|path| help::read_yaml::<IMotrix>(&path)) {
            Ok(mut config) => {
                logging!(info, Type::Core, true, "Loaded config: {:?}", config);
                let template = serde_yaml::to_value(template).unwrap_or_default();
                let mut config_value = serde_yaml::to_value(&config).unwrap_or_default();

                if let Some(template_map) = template.as_mapping() {
                    if let Some(config_map) = config_value.as_mapping_mut() {
                        for (key, value) in template_map {
                            if let Some(v) = config_map.get_mut(key) {
                                if v.is_null() {
                                    *v = value.clone();
                                }
                            } else {
                                config_map.insert(key.clone(), value.clone());
                            }
                        }
                    }
                }

                config = serde_yaml::from_value(config_value).unwrap_or(config);

                logging!(info, Type::Core, true, "Finally config: {:?}", config);
                config
            }
            Err(err) => {
                logging!(error, Type::Core, true, "{err}");
                template
            }
        }
    }

    pub fn template() -> Self {
        let mut tracker_source = Vec::new();

        tracker_source
            .push("https://cdn.jsdelivr.net/gh/ngosang/trackerslist/trackers_best_ip.txt".into());

        tracker_source
            .push("https://cdn.jsdelivr.net/gh/ngosang/trackerslist/trackers_best.txt".into());

        IMotrix {
            aria2_engine: Some("aria2c".into()),
            language: i18n::get_system_language().into(),
            theme_mode: Some("system".into()),
            app_log_level: Some("info".into()),
            enable_auto_launch: Some(false),
            auto_log_clean: Some(3),
            auto_check_update: Some(true),
            auto_resume_all: Some(false),
            new_task_show_downloading: Some(false),
            no_confirm_before_delete_task: Some(false),
            task_completed_notify: Some(true),
            tracker_source: Some(tracker_source),
            enable_upnp: Some(true),
            bt_listen_port: Some(21301),
            dht_listen_port: Some(26701),
            ..Self::default()
        }
    }

    /// Save IMotrix App Config
    pub fn save_file(&self) -> Result<()> {
        help::save_yaml(&dirs::motrix_path()?, &self, Some("# tauri-motrix Config"))
    }

    /// patch motrix config
    /// only save to file
    ///
    pub fn patch_config(&mut self, patch: IMotrix) {
        macro_rules! patch {
            ($key: ident) => {
                if patch.$key.is_some() {
                    self.$key = patch.$key;
                }
            };
        }

        patch!(theme_mode);
        patch!(app_log_level);
        patch!(aria2_engine);
        patch!(language);
        patch!(enable_auto_launch);
        patch!(auto_log_clean);
        patch!(auto_check_update);
        patch!(auto_resume_all);
        patch!(new_task_show_downloading);
        patch!(no_confirm_before_delete_task);
        patch!(task_completed_notify);
        patch!(tracker_source);

        patch!(enable_upnp);
        patch!(bt_listen_port);
        patch!(dht_listen_port);
    }
}

#[cfg(test)]
mod tests {
    use super::IMotrix;

    #[test]
    fn test_patch_config() {
        let mut motrix = IMotrix {
            ..Default::default()
        };

        motrix.patch_config(IMotrix {
            theme_mode: Some("light".into()),
            ..Default::default()
        });

        assert_eq!(motrix.theme_mode.unwrap(), "light")
    }
}
