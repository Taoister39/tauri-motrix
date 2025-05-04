use anyhow::Result;
use serde_json::{json, Value};

use crate::{config::Config, logging, utils::logging::Type};

pub fn get_aria2_client_info() -> (String, String) {
    let client = { Config::aria2().latest().get_client_info() };
    let server = format!("http://{}", client.server);

    // TODO: replace secret
    let secret = "".into();
    (server, secret)
}

pub fn ensure_prefix(name: &str) -> String {
    if name.starts_with("aria2.") || name.starts_with("system.") {
        name.to_string()
    } else {
        format!("aria2.{}", name)
    }
}

pub async fn call(name: &str, data: &[Value]) -> Result<Value> {
    let (server, _secret) = get_aria2_client_info();

    let url = format!("{}/jsonrpc", server);
    let client = reqwest::Client::new();

    let id = uuid::Uuid::new_v4().to_string();

    let json_rpc_message = json!({
        "jsonrpc": "2.0",
        "method":ensure_prefix(name),
        "id": id,
        "params":data
    });

    logging!(
        info,
        Type::Engine,
        true,
        "json_rpc_message: {}",
        json_rpc_message.to_string()
    );

    let res = client
        .post(&url)
        .header("Content-Type", "application/json")
        .body(json_rpc_message.to_string())
        .send()
        .await
        .map_err(|e| {
            logging!(error, Type::Engine, true, "aria2c call error: {}", e);
            e
        })?
        .json::<Value>()
        .await?;

    logging!(
        info,
        Type::Engine,
        true,
        "aria2c call result: {}",
        res.to_string()
    );

    if res.get("error").is_some() {
        let error = res.get("error").unwrap();
        let code = error.get("code").unwrap().as_i64().unwrap();
        let message = error.get("message").unwrap().as_str().unwrap();
        logging!(
            error,
            Type::Engine,
            true,
            "aria2c call error: {} {}",
            code,
            message
        );
        return Err(anyhow::anyhow!("aria2c call error: {} {}", code, message));
    }

    Ok(res)
}

pub async fn change_global_option(data: &[Value]) -> Result<Value> {
    call("changeGlobalOption", data).await
}
