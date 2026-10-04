//! Background, best-effort IPv4 UPnP mappings on an existing Tokio runtime.
//!
//! Updates replace the entire desired set without waiting for network I/O. Call
//! `shutdown` before exiting to remove mappings; dropping the manager also asks
//! the worker to clean up, but cannot wait for it. A lost response or abrupt exit
//! can leave a mapping behind, particularly on gateways requiring permanent leases.

mod backend;
mod worker;

use std::{fmt, net::Ipv4Addr, time::Duration};

pub use igd_next::PortMappingProtocol;
use tokio::{sync::watch, task::AbortHandle};

/// One fixed external port forwarded to a local IPv4 endpoint.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Mapping {
    pub protocol: PortMappingProtocol,
    pub external_port: u16,
    pub internal_port: u16,
    /// `None` selects the local interface used to reach the discovered gateway.
    pub local_address: Option<Ipv4Addr>,
    pub description: String,
}

impl Mapping {
    fn key(&self) -> (u16, bool) {
        (
            self.external_port,
            self.protocol == PortMappingProtocol::TCP,
        )
    }
}

/// Timeouts and lease policy. All durations must be positive; renew before expiry.
#[derive(Clone, Debug)]
pub struct Options {
    pub discovery_timeout: Duration,
    pub operation_timeout: Duration,
    pub shutdown_timeout: Duration,
    pub lease_duration: u32,
    pub renewal_interval: Duration,
}

impl Default for Options {
    fn default() -> Self {
        Self {
            discovery_timeout: Duration::from_secs(5),
            operation_timeout: Duration::from_secs(5),
            shutdown_timeout: Duration::from_secs(3),
            lease_duration: 3600,
            renewal_interval: Duration::from_secs(1800),
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum Error {
    InvalidMapping(&'static str),
    InvalidOptions,
    NoRuntime,
    Closed,
    ShutdownTimedOut,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidMapping(reason) => write!(f, "Invalid UPnP mapping: {reason}"),
            Self::InvalidOptions => write!(
                f,
                "UPnP timeouts and lease must be positive; renew before expiry"
            ),
            Self::NoRuntime => write!(f, "UPnP manager requires a Tokio runtime"),
            Self::Closed => write!(f, "UPnP manager is closed"),
            Self::ShutdownTimedOut => write!(
                f,
                "UPnP cleanup timed out; mappings may remain on the gateway"
            ),
        }
    }
}

impl std::error::Error for Error {}

/// Owns a single serial worker. Network failures are logged and retried there.
pub struct UpnpManager {
    desired: watch::Sender<Option<Vec<Mapping>>>,
    finished: watch::Receiver<Option<bool>>,
    abort: AbortHandle,
    shutdown_timeout: Duration,
}

impl UpnpManager {
    pub fn start(options: Options) -> Result<Self, Error> {
        Self::with_backend(options, backend::Igd)
    }

    fn with_backend<B: backend::Backend>(options: Options, backend: B) -> Result<Self, Error> {
        if options.discovery_timeout.is_zero()
            || options.operation_timeout.is_zero()
            || options.shutdown_timeout.is_zero()
            || options.lease_duration == 0
            || options.renewal_interval.is_zero()
            || options.renewal_interval >= Duration::from_secs(options.lease_duration.into())
        {
            return Err(Error::InvalidOptions);
        }
        let runtime = tokio::runtime::Handle::try_current().map_err(|_| Error::NoRuntime)?;
        let (desired, updates) = watch::channel(Some(Vec::new()));
        let (done, finished) = watch::channel(None);
        // Capture the guard before spawning, so aborting an unpolled task also
        // notifies every concurrent shutdown waiter.
        let completion = Completion {
            done,
            success: false,
        };
        let shutdown_timeout = options.shutdown_timeout;
        let task = runtime.spawn(async move {
            let mut completion = completion;
            completion.success = worker::Worker::new(backend, options, updates).run().await;
        });
        Ok(Self {
            desired,
            finished,
            abort: task.abort_handle(),
            shutdown_timeout,
        })
    }

    /// Validate and replace the desired set. An empty set disables mappings.
    /// Identical duplicates are coalesced; conflicting duplicate keys are rejected.
    pub fn update(&self, mappings: Vec<Mapping>) -> Result<(), Error> {
        if self.desired.is_closed() || self.desired.borrow().is_none() {
            return Err(Error::Closed);
        }
        let mappings = validate(mappings)?;
        let mut closed = false;
        self.desired.send_if_modified(|desired| match desired {
            None => {
                closed = true;
                false
            }
            Some(current) if *current == mappings => false,
            Some(current) => {
                *current = mappings;
                true
            }
        });
        if closed {
            Err(Error::Closed)
        } else {
            Ok(())
        }
    }

    /// Stop accepting updates and wait for bounded best-effort cleanup.
    /// Safe to call repeatedly or concurrently, including from another runtime.
    pub async fn shutdown(&self) -> Result<(), Error> {
        self.desired.send_if_modified(|desired| {
            if desired.is_none() {
                false
            } else {
                *desired = None;
                true
            }
        });
        let mut finished = self.finished.clone();
        let wait = async {
            loop {
                if let Some(success) = *finished.borrow_and_update() {
                    return success;
                }
                if finished.changed().await.is_err() {
                    return false;
                }
            }
        };
        match tokio::time::timeout(self.shutdown_timeout, wait).await {
            Ok(true) => Ok(()),
            _ => {
                self.abort.abort();
                Err(Error::ShutdownTimedOut)
            }
        }
    }
}

struct Completion {
    done: watch::Sender<Option<bool>>,
    success: bool,
}

impl Drop for Completion {
    fn drop(&mut self) {
        self.done.send_replace(Some(self.success));
    }
}

fn validate(mut mappings: Vec<Mapping>) -> Result<Vec<Mapping>, Error> {
    for mapping in &mappings {
        if mapping.external_port == 0 || mapping.internal_port == 0 {
            return Err(Error::InvalidMapping("ports must be nonzero"));
        }
        if mapping.local_address.is_some_and(|ip| {
            ip.is_unspecified() || ip.is_loopback() || ip.is_multicast() || ip.is_broadcast()
        }) {
            return Err(Error::InvalidMapping(
                "local address must be a unicast LAN IPv4 address",
            ));
        }
    }
    mappings.sort_by_key(Mapping::key);
    for pair in mappings.windows(2) {
        if pair[0].key() == pair[1].key() && pair[0] != pair[1] {
            return Err(Error::InvalidMapping(
                "conflicting mappings for the same protocol and external port",
            ));
        }
    }
    mappings.dedup();
    Ok(mappings)
}

#[cfg(test)]
mod tests;
