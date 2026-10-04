use anyhow::{bail, Context, Result};
use parking_lot::Mutex;
use std::sync::Arc;
use upnp_mapping::{Mapping, Options, PortMappingProtocol, UpnpManager};

use crate::config::{Config, IMotrix};

enum ManagerState {
    Idle,
    Running(Arc<UpnpManager>),
    Stopped(Option<Arc<UpnpManager>>),
}

static MANAGER: Mutex<ManagerState> = Mutex::new(ManagerState::Idle);

pub fn create_upnp_mappings(motrix: &IMotrix) -> Result<Vec<Mapping>> {
    let bt_port = motrix
        .bt_listen_port
        .context("bt_listen_port is required")?;
    let dht_port = motrix
        .dht_listen_port
        .context("dht_listen_port is required")?;
    if bt_port == 0 || dht_port == 0 {
        bail!("UPnP listen ports must be nonzero");
    }
    if !motrix.enable_upnp.unwrap_or(false) {
        return Ok(Vec::new());
    }
    Ok(vec![
        Mapping {
            protocol: PortMappingProtocol::TCP,
            external_port: bt_port,
            internal_port: bt_port,
            local_address: None,
            description: "tauri-motrix BT".into(),
        },
        Mapping {
            protocol: PortMappingProtocol::UDP,
            external_port: dht_port,
            internal_port: dht_port,
            local_address: None,
            description: "tauri-motrix DHT".into(),
        },
    ])
}

/// Submit the complete configuration without waiting for gateway discovery or I/O.
pub fn run_upnp_mapping() -> Result<()> {
    let mut state = MANAGER.lock();
    // Read committed configuration while serializing submissions, so delayed
    // setup or concurrent saves cannot submit an older configuration afterward.
    let mappings = create_upnp_mappings(&Config::motrix().data())?;
    if matches!(*state, ManagerState::Idle) {
        *state = ManagerState::Running(Arc::new(UpnpManager::start(Options::default())?));
    }
    match &*state {
        ManagerState::Running(manager) => manager.update(mappings)?,
        _ => bail!("UPnP manager is shutting down"),
    }
    Ok(())
}

pub async fn shutdown_upnp_mapping() {
    // Mark shutdown before releasing the lock, including when setup has not
    // created a manager yet. A late setup/config update cannot start a new worker.
    let manager = {
        let mut state = MANAGER.lock();
        let previous = std::mem::replace(&mut *state, ManagerState::Stopped(None));
        let manager = match previous {
            ManagerState::Running(manager) => Some(manager),
            ManagerState::Stopped(manager) => manager,
            ManagerState::Idle => None,
        };
        // Keep the instance for concurrent shutdown callers to wait on.
        *state = ManagerState::Stopped(manager.clone());
        manager
    };
    if let Some(manager) = manager {
        if let Err(error) = manager.shutdown().await {
            log::warn!(target: "app", "Failed to clean up UPnP mappings: {error}");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> IMotrix {
        IMotrix {
            enable_upnp: Some(true),
            bt_listen_port: Some(21301),
            dht_listen_port: Some(26701),
            ..Default::default()
        }
    }

    #[test]
    fn maps_bt_tcp_and_dht_udp_even_when_ports_are_equal() {
        let mut config = config();
        config.dht_listen_port = config.bt_listen_port;
        let mappings = create_upnp_mappings(&config).unwrap();
        assert_eq!(mappings.len(), 2);
        assert_eq!(mappings[0].protocol, PortMappingProtocol::TCP);
        assert_eq!(mappings[1].protocol, PortMappingProtocol::UDP);
        for mapping in mappings {
            assert_eq!(mapping.internal_port, 21301);
            assert_eq!(mapping.external_port, 21301);
            assert_eq!(mapping.local_address, None);
        }
        config.enable_upnp = Some(false);
        assert!(create_upnp_mappings(&config).unwrap().is_empty());
    }

    #[test]
    fn rejects_missing_and_zero_ports() {
        for (bt, dht) in [
            (None, Some(1)),
            (Some(1), None),
            (Some(0), Some(1)),
            (Some(1), Some(0)),
        ] {
            let mut config = config();
            config.bt_listen_port = bt;
            config.dht_listen_port = dht;
            assert!(create_upnp_mappings(&config).is_err());
        }
    }
}
