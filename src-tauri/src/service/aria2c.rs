use anyhow::Result;
use serde_json::{json, Value};

use crate::{
    config::{Aria2Info, Config},
    logging,
    utils::logging::Type,
};

pub fn ensure_prefix(name: &str) -> String {
    if name.starts_with("aria2.") || name.starts_with("system.") {
        name.to_string()
    } else {
        format!("aria2.{}", name)
    }
}

pub async fn call(name: &str, data: &[Value]) -> Result<Value> {
    let info = Config::aria2().data().get_client_info();
    call_with_info(&info, name, data).await
}

fn rpc_params(name: &str, data: &[Value], secret: &str) -> Vec<Value> {
    let mut params = Vec::new();
    if !secret.is_empty() && ensure_prefix(name).starts_with("aria2.") {
        params.push(json!(format!("token:{secret}")));
    }
    params.extend_from_slice(data);
    params
}

pub async fn call_with_info(info: &Aria2Info, name: &str, data: &[Value]) -> Result<Value> {
    let url = format!("http://{}/jsonrpc", info.server);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()?;

    let id = uuid::Uuid::new_v4().to_string();

    let json_rpc_message = json!({
        "jsonrpc": "2.0",
        "method":ensure_prefix(name),
        "id": id,
        "params": rpc_params(name, data, &info.secret)
    });

    logging!(info, Type::Engine, true, "aria2c call: {}", name);

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

    logging!(info, Type::Engine, true, "aria2c call completed: {}", name);

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

pub async fn unpause_all() -> Result<Value> {
    call("unpauseAll", [].clone().as_ref()).await
}

#[cfg(test)]
mod tests {
    use super::rpc_params;
    use serde_json::json;

    #[test]
    fn rpc_authentication_params() {
        let options = json!({"dir": "Downloads"});
        assert_eq!(
            rpc_params("changeGlobalOption", &[options.clone()], "secret"),
            vec![json!("token:secret"), options.clone()]
        );
        assert_eq!(
            rpc_params("changeGlobalOption", &[options.clone()], ""),
            vec![options]
        );
        assert!(rpc_params("system.listMethods", &[], "secret").is_empty());
    }
}
