use std::{
    future::Future,
    net::{Ipv4Addr, SocketAddr},
    time::Duration,
};

use igd_next::{
    aio::{
        tokio::{search_gateway, Tokio},
        Gateway,
    },
    AddPortError, RemovePortError, SearchOptions,
};
use tokio::net::UdpSocket;

use crate::Mapping;

#[derive(Clone)]
pub(crate) struct Connection<G> {
    pub gateway: G,
    pub address: SocketAddr,
    pub local_address: Ipv4Addr,
}

#[derive(Debug)]
pub(crate) enum NetworkError {
    Transport(String),
    PermanentOnly,
    Rejected(String),
}

impl std::fmt::Display for NetworkError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Transport(message) | Self::Rejected(message) => f.write_str(message),
            Self::PermanentOnly => f.write_str("gateway only supports permanent leases"),
        }
    }
}

// Internal boundary for deterministic lifecycle tests without a physical router.
pub(crate) trait Backend: Send + 'static {
    type Gateway: Clone + Send + Sync;
    fn discover(
        &mut self,
        timeout: Duration,
    ) -> impl Future<Output = Result<Connection<Self::Gateway>, NetworkError>> + Send;
    fn add(
        &mut self,
        gateway: &Self::Gateway,
        mapping: &Mapping,
        local: Ipv4Addr,
        lease: u32,
    ) -> impl Future<Output = Result<(), NetworkError>> + Send;
    fn remove(
        &mut self,
        gateway: &Self::Gateway,
        mapping: &Mapping,
    ) -> impl Future<Output = Result<(), NetworkError>> + Send;
}

pub(crate) struct Igd;

impl Backend for Igd {
    type Gateway = Gateway<Tokio>;

    async fn discover(
        &mut self,
        timeout: Duration,
    ) -> Result<Connection<Self::Gateway>, NetworkError> {
        let options = SearchOptions {
            timeout: Some(timeout),
            ..Default::default()
        };
        let gateway = search_gateway(options)
            .await
            .map_err(|err| NetworkError::Transport(err.to_string()))?;
        // Connecting a UDP socket chooses the route without sending traffic.
        let socket = UdpSocket::bind((Ipv4Addr::UNSPECIFIED, 0))
            .await
            .map_err(|err| NetworkError::Transport(err.to_string()))?;
        socket
            .connect(gateway.addr)
            .await
            .map_err(|err| NetworkError::Transport(err.to_string()))?;
        let local_address = match socket
            .local_addr()
            .map_err(|err| NetworkError::Transport(err.to_string()))?
            .ip()
        {
            std::net::IpAddr::V4(ip) if !ip.is_unspecified() && !ip.is_loopback() => ip,
            _ => {
                return Err(NetworkError::Rejected(
                    "no usable IPv4 route to UPnP gateway".into(),
                ));
            }
        };
        Ok(Connection {
            address: gateway.addr,
            gateway,
            local_address,
        })
    }

    async fn add(
        &mut self,
        gateway: &Self::Gateway,
        mapping: &Mapping,
        local: Ipv4Addr,
        lease: u32,
    ) -> Result<(), NetworkError> {
        gateway
            .add_port(
                mapping.protocol,
                mapping.external_port,
                SocketAddr::from((local, mapping.internal_port)),
                lease,
                &mapping.description,
            )
            .await
            .map_err(|err| match err {
                AddPortError::OnlyPermanentLeasesSupported => NetworkError::PermanentOnly,
                AddPortError::RequestError(err) => NetworkError::Transport(err.to_string()),
                other => NetworkError::Rejected(other.to_string()),
            })
    }

    async fn remove(
        &mut self,
        gateway: &Self::Gateway,
        mapping: &Mapping,
    ) -> Result<(), NetworkError> {
        match gateway
            .remove_port(mapping.protocol, mapping.external_port)
            .await
        {
            Ok(()) | Err(RemovePortError::NoSuchPortMapping) => Ok(()),
            Err(RemovePortError::RequestError(err)) => {
                Err(NetworkError::Transport(err.to_string()))
            }
            Err(other) => Err(NetworkError::Rejected(other.to_string())),
        }
    }
}
