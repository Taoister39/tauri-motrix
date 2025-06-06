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
                            config_map
                                .entry(key.clone())
                                .or_insert_with(|| value.clone());
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
        IMotrix {
            aria2_engine: Some("aria2c".into()),
            language: i18n::get_system_language().into(),
            theme_mode: Some("system".into()),
            app_log_level: Some("info".into()),
            enable_auto_launch: Some(false),
            auto_log_clean: Some(3),
            auto_check_update: Some(true),
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
