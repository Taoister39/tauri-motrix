use std::fs;

use anyhow::Result;
use chrono::Local;
use log4rs::{
    append::{console::ConsoleAppender, file::FileAppender},
    config::{Appender, Logger, Root},
    encode::pattern::PatternEncoder,
};

use crate::{
    config::{IAria2Temp, IMotrix},
    log_err,
    service::{self, log::WEBVIEW_TARGET},
    utils::{
        dirs,
        help::{self, simple_save_file},
    },
};

pub fn init_log() -> Result<()> {
    let log_dir = dirs::app_logs_dir()?;

    if !log_dir.exists() {
        let _ = fs::create_dir_all(&log_dir);
    }

    let local_time = Local::now().format("%Y-%m-%d-%H%M").to_string();
    let log_file = format!("{}.log", local_time);
    let log_file = log_dir.join(log_file);

    let encode = Box::new(PatternEncoder::new("{d(%Y-%m-%d %H:%M:%S)} {l} - {m}{n}"));

    let log_level = service::log::get_log_level();

    let stdout = ConsoleAppender::builder().encoder(encode.clone()).build();
    let to_file = FileAppender::builder().encoder(encode).build(log_file)?;

    let mut app_logger_builder = Logger::builder();
    let mut webview_logger_builder = Logger::builder();
    let root_builder = Root::builder();

    app_logger_builder = app_logger_builder.appender("stdout").appender("file");
    webview_logger_builder = webview_logger_builder.appender("file"); // Only log webview to file

    let (config, _) = log4rs::config::Config::builder()
        .appender(Appender::builder().build("stdout", Box::new(stdout)))
        .appender(Appender::builder().build("file", Box::new(to_file)))
        .logger(app_logger_builder.additive(false).build("app", log_level))
        .logger(
            webview_logger_builder
                .additive(false)
                .build(WEBVIEW_TARGET, log_level),
        ) // Add webview logger
        .build_lossy(root_builder.build(log_level));

    log4rs::init_config(config)?;

    Ok(())
}

pub fn init_config() -> Result<()> {
    let _ = init_log();
    let _ = service::log::delete_log();

    log_err!(dirs::app_home_dir().map(|app_dir| {
        if !app_dir.exists() {
            let _ = fs::create_dir_all(&app_dir);
        }
    }));

    log_err!(dirs::aria2_path().map(|aria2_path| {
        if !aria2_path.exists() {
            let _ = simple_save_file(&aria2_path, &IAria2Temp::template());
        }
    }));

    log_err!(dirs::motrix_path().map(|motrix_path| {
        if !motrix_path.exists() {
            let _ = help::save_yaml(
                &motrix_path,
                &IMotrix::template(),
                Some("# Created by tauri-motrix"),
            );
        }
    }));

    log_err!(dirs::aria2_download_session_path().map(|session_path| {
        if !session_path.exists() {
            let _ = fs::File::create(&session_path);
        }
    }));

    Ok(())
}

pub fn init_resources() -> Result<()> {
    let app_dir = dirs::app_home_dir()?;
    let res_dir = dirs::app_resources_dir()?;

    if !app_dir.exists() {
        let _ = fs::create_dir_all(&app_dir);
    }

    if !res_dir.exists() {
        let _ = fs::create_dir_all(&res_dir);
    }

    Ok(())
}
