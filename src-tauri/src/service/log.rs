use std::fs::{self, DirEntry};

use anyhow::Result;
use chrono::{Local, TimeZone};
use log::{logger, Level, LevelFilter, RecordBuilder};
use serde::{Deserialize, Serialize};

use crate::{config::Config, utils::dirs};

pub fn delete_log() -> Result<()> {
    let log_dir = dirs::app_logs_dir()?;
    if !log_dir.exists() {
        return Ok(());
    }

    let auto_log_clean = {
        let motrix = Config::motrix();
        let motrix = motrix.latest();
        motrix.auto_log_clean.unwrap_or(0)
    };

    let day = match auto_log_clean {
        1 => 7,
        2 => 30,
        3 => 90,
        _ => return Ok(()),
    };

    log::debug!(target: "app", "try to delete log files, day: {day}");

    // %Y-%m-%d to NaiveDateTime
    let parse_time_str = |s: &str| {
        let sa: Vec<&str> = s.split('-').collect();
        if sa.len() != 4 {
            return Err(anyhow::anyhow!("invalid time str"));
        }

        let year = i32::from_str_radix(sa[0], 10)?;
        let month = u32::from_str_radix(sa[1], 10)?;
        let day = u32::from_str_radix(sa[2], 10)?;
        let time = chrono::NaiveDate::from_ymd_opt(year, month, day)
            .ok_or(anyhow::anyhow!("invalid time str"))?
            .and_hms_opt(0, 0, 0)
            .ok_or(anyhow::anyhow!("invalid time str"))?;
        Ok(time)
    };

    let process_file = |file: DirEntry| -> Result<()> {
        let file_name = file.file_name();
        let file_name = file_name.to_str().unwrap_or_default();

        if file_name.ends_with(".log") {
            let now = Local::now();
            let created_time = parse_time_str(&file_name[0..file_name.len() - 4])?;
            let file_time = Local
                .from_local_datetime(&created_time)
                .single()
                .ok_or(anyhow::anyhow!("invalid local datetime"))?;

            let duration = now.signed_duration_since(file_time);
            if duration.num_days() > day {
                let file_path = file.path();
                let _ = fs::remove_file(file_path);
                log::info!(target: "app", "delete log file: {file_name}");
            }
        }
        Ok(())
    };

    for file in fs::read_dir(&log_dir)?.flatten() {
        let _ = process_file(file);
    }

    let service_log_dir = log_dir.join("service");
    for file in fs::read_dir(service_log_dir)?.flatten() {
        let _ = process_file(file);
    }

    Ok(())
}

pub fn get_log_level() -> LevelFilter {
    let motrix = Config::motrix().data().clone();

    if let Some(level) = motrix.app_log_level.as_ref() {
        match level.to_lowercase().as_str() {
            "silent" => LevelFilter::Off,
            "error" => LevelFilter::Error,
            "warning" => LevelFilter::Warn,
            "info" => LevelFilter::Info,
            "debug" => LevelFilter::Debug,
            "trace" => LevelFilter::Trace,
            _ => LevelFilter::Info,
        }
    } else {
        LevelFilter::Info
    }
}

pub const WEBVIEW_TARGET: &str = "webview";

pub fn expose_log_wrap(level: String, message: String, location: Option<&str>) {
    let level_map = match level.to_lowercase().as_str() {
        "trace" => Level::Trace,
        "debug" => Level::Debug,
        "info" => Level::Info,
        "warn" => Level::Warn,
        "error" => Level::Error,
        _ => Level::Info, // Default to Info for unknown levels
    };

    let target = match location {
        Some(loc) => format!("{WEBVIEW_TARGET}:{loc}"),
        None => WEBVIEW_TARGET.to_string(),
    };

    let mut builder = RecordBuilder::new();
    builder.level(level_map).target(&target);

    logger().log(&builder.args(format_args!("{}", message)).build());
}
