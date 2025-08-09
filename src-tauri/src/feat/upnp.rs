use anyhow::Result;
// use easy_upnp::{add_ports, delete_ports, PortMappingProtocol, UpnpConfig};

use crate::config::{Config, IMotrix};

fn create_upnp_config_factory(bt_listen_port: u16, dht_listen_port: u16) -> Result<()> {
    // let bt_listen_address = UpnpConfig {
    //     address: None,
    //     port: bt_listen_port,
    //     protocol: PortMappingProtocol::TCP,
    //     duration: 3600,
    //     comment: "bt_listen_port Webserver".to_string(),
    // };

    // let dht_listen_address = UpnpConfig {
    //     address: None,
    //     port: dht_listen_port,
    //     protocol: PortMappingProtocol::TCP,
    //     duration: 3600,
    //     comment: "dht_listen_port Webserver".to_string(),
    // };

    // Ok([bt_listen_address, dht_listen_address])
    Ok(())
}

pub fn run_upnp_mapping(motrix: &IMotrix) -> Result<()> {
    let bt_listen_port = motrix.bt_listen_port.expect("bt_listen_port is required");
    let dht_listen_port = motrix.dht_listen_port.expect("dht_listen_port is required");

    // for result in add_ports(create_upnp_config_factory(bt_listen_port, dht_listen_port)?) {
    //     if let Err(err) = result {
    //         log::error!(target: "app", "Failed to start UPnP port mapping: {}", err);
    //     }
    // }
    Ok(())
}

pub fn destory_upnp_mapping(motrix: &IMotrix) -> Result<()> {
    let bt_listen_port = motrix.bt_listen_port.expect("bt_listen_port is required");
    let dht_listen_port = motrix.dht_listen_port.expect("dht_listen_port is required");

    // for result in delete_ports(create_upnp_config_factory(bt_listen_port, dht_listen_port)?) {
    //     if let Err(err) = result {
    //         log::error!(target: "app", "Failed to start UPnP port mapping: {}", err);
    //     }
    // }
    Ok(())
}

pub fn patch_upnp_config(
    enable_upnp: Option<bool>,
    bt_listen_port: Option<u16>,
    dht_listen_port: Option<u16>,
) -> Result<()> {
    let old_motrix = Config::motrix().data().clone();
    let was_upnp_enabled = old_motrix.enable_upnp.unwrap_or(false);

    if was_upnp_enabled {
        destory_upnp_mapping(&old_motrix)?;
    }

    let new_motrix = Config::motrix().draft().clone();
    let should_enable_upnp = enable_upnp.unwrap_or(was_upnp_enabled);

    if should_enable_upnp {
        let mut updated_motrix = new_motrix;
        // Update the ports if provided
        if let Some(port) = bt_listen_port {
            updated_motrix.bt_listen_port = Some(port);
        }
        if let Some(port) = dht_listen_port {
            updated_motrix.dht_listen_port = Some(port);
        }
        run_upnp_mapping(&updated_motrix)?;
    }

    Ok(())
}
