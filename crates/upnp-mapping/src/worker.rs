use std::{
    collections::BTreeMap,
    net::{Ipv4Addr, SocketAddr},
    time::Duration,
};

use tokio::{
    sync::watch,
    time::{sleep_until, timeout, Instant},
};

use crate::{
    backend::{Backend, Connection, NetworkError},
    Mapping, Options,
};

type Key = (u16, bool);

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum Operation {
    Add,
    Remove(SocketAddr),
}

struct Retry {
    at: Instant,
    delay: Duration,
    message: String,
}

impl Retry {
    fn failed(previous: Option<Self>, error: &NetworkError, context: &str) -> Self {
        let message = error.to_string();
        let delay = previous.as_ref().map_or(Duration::from_secs(5), |retry| {
            (retry.delay * 2).min(Duration::from_secs(60))
        });
        if previous
            .as_ref()
            .is_none_or(|retry| retry.message != message)
        {
            log::warn!("UPnP {context}: {message}");
        }
        Self {
            at: Instant::now() + delay,
            delay,
            message,
        }
    }
}

struct Installed<G> {
    mapping: Mapping,
    connection: Connection<G>,
    local_address: Ipv4Addr,
    lease: u32,
    renew_at: Instant,
}

pub(crate) struct Worker<B: Backend> {
    backend: B,
    options: Options,
    updates: watch::Receiver<Option<Vec<Mapping>>>,
    connection: Option<Connection<B::Gateway>>,
    discovered_at: Instant,
    discovery_retry: Option<Retry>,
    installed: Vec<Installed<B::Gateway>>,
    failures: BTreeMap<(Key, Operation), Retry>,
}

impl<B: Backend> Worker<B> {
    pub fn new(
        backend: B,
        options: Options,
        updates: watch::Receiver<Option<Vec<Mapping>>>,
    ) -> Self {
        Self {
            backend,
            options,
            updates,
            connection: None,
            discovered_at: Instant::now(),
            discovery_retry: None,
            installed: Vec::new(),
            failures: BTreeMap::new(),
        }
    }

    pub async fn run(mut self) -> bool {
        let mut previous = Vec::new();
        loop {
            let desired = self.updates.borrow_and_update().clone();
            if self.updates.has_changed().is_err() || desired.is_none() {
                // The manager also bounds shutdown from the moment it is requested,
                // including any operation that was already in flight.
                let budget = self.options.shutdown_timeout;
                let success = timeout(budget, self.cleanup()).await.is_ok();
                if !success {
                    log::warn!("UPnP cleanup timed out; mappings may remain on the gateway");
                }
                return success;
            }
            let desired = desired.unwrap();
            if desired != previous {
                self.failures.retain(|(key, operation), _| match operation {
                    Operation::Add => desired
                        .iter()
                        .any(|mapping| mapping.key() == *key && previous.contains(mapping)),
                    Operation::Remove(address) => self.installed.iter().any(|entry| {
                        entry.mapping.key() == *key && entry.connection.address == *address
                    }),
                });
                self.discovery_retry = None;
                if desired.is_empty() {
                    self.connection = None;
                }
                previous = desired.clone();
            }
            // Execute only one bounded network operation before re-reading updates.
            if self.step(&desired).await {
                continue;
            }
            let deadline = self.next_deadline(&desired);
            tokio::select! {
                _ = self.updates.changed() => {},
                _ = async {
                    if let Some(deadline) = deadline {
                        sleep_until(deadline).await;
                    } else {
                        std::future::pending::<()>().await;
                    }
                } => {},
            }
        }
    }

    fn needs_removal(&self, entry: &Installed<B::Gateway>, desired: &[Mapping]) -> bool {
        !desired.contains(&entry.mapping)
            || self.connection.as_ref().is_some_and(|connection| {
                connection.address != entry.connection.address
                    || entry.local_address
                        != entry
                            .mapping
                            .local_address
                            .unwrap_or(connection.local_address)
            })
    }

    fn ready(&self, key: Key, operation: Operation) -> bool {
        self.failures
            .get(&(key, operation))
            .is_none_or(|retry| retry.at <= Instant::now())
    }

    // Keep failed cleanup on an old gateway independent from establishing the
    // same external port on a new gateway. On one gateway, replace only after
    // the previous endpoint has been removed.
    fn current_entry(&self, key: Key) -> Option<usize> {
        self.installed.iter().rposition(|entry| {
            entry.mapping.key() == key
                && self
                    .connection
                    .as_ref()
                    .is_none_or(|connection| entry.connection.address == connection.address)
        })
    }

    fn fail(&mut self, key: Key, operation: Operation, error: &NetworkError) {
        let previous = self.failures.remove(&(key, operation));
        let context = format!(
            "{} {} port {}",
            if operation == Operation::Add {
                "map/renew"
            } else {
                "remove"
            },
            if key.1 { "TCP" } else { "UDP" },
            key.0
        );
        self.failures
            .insert((key, operation), Retry::failed(previous, error, &context));
    }

    fn recovered(&mut self, key: Key, operation: Operation) {
        if self.failures.remove(&(key, operation)).is_some() {
            log::info!(
                "UPnP operation recovered for {} port {}",
                if key.1 { "TCP" } else { "UDP" },
                key.0
            );
        }
    }

    async fn step(&mut self, desired: &[Mapping]) -> bool {
        if let Some(index) = self.installed.iter().position(|entry| {
            self.needs_removal(entry, desired)
                && self.ready(
                    entry.mapping.key(),
                    Operation::Remove(entry.connection.address),
                )
        }) {
            self.remove(index).await;
            return true;
        }

        let candidate = desired.iter().find(|mapping| {
            if !self.ready(mapping.key(), Operation::Add) {
                return false;
            }
            match self.current_entry(mapping.key()) {
                Some(index) => {
                    let entry = &self.installed[index];
                    entry.mapping == **mapping
                        && !self.needs_removal(entry, desired)
                        && entry.renew_at <= Instant::now()
                }
                None => true,
            }
        });
        let Some(mapping) = candidate else {
            return false;
        };
        if self.connection.is_none()
            || self.discovered_at + self.options.renewal_interval <= Instant::now()
        {
            if self
                .discovery_retry
                .as_ref()
                .is_some_and(|retry| retry.at > Instant::now())
            {
                return false;
            }
            self.connection = None;
            let result = bounded(
                self.options.discovery_timeout,
                self.backend.discover(self.options.discovery_timeout),
            )
            .await;
            match result {
                Ok(connection) => {
                    if self.discovery_retry.take().is_some() {
                        log::info!("UPnP gateway discovery recovered");
                    }
                    self.connection = Some(connection);
                    self.discovered_at = Instant::now();
                }
                Err(error) => {
                    self.discovery_retry = Some(Retry::failed(
                        self.discovery_retry.take(),
                        &error,
                        "discover gateway",
                    ));
                }
            }
            return true;
        }

        let connection = self.connection.as_ref().unwrap().clone();
        let local = mapping.local_address.unwrap_or(connection.local_address);
        let old = self.current_entry(mapping.key());
        let lease = old.map_or(self.options.lease_duration, |index| {
            self.installed[index].lease
        });
        let result = bounded(self.options.operation_timeout, async {
            match self
                .backend
                .add(&connection.gateway, mapping, local, lease)
                .await
            {
                Err(NetworkError::PermanentOnly) if lease != 0 => {
                    self.backend
                        .add(&connection.gateway, mapping, local, 0)
                        .await?;
                    log::info!(
                        "UPnP gateway {} requires a permanent lease for {} port {}",
                        connection.address,
                        mapping.protocol,
                        mapping.external_port
                    );
                    Ok(0)
                }
                Ok(()) => Ok(lease),
                Err(error) => Err(error),
            }
        })
        .await;
        match result {
            Ok(lease) => {
                self.recovered(mapping.key(), Operation::Add);
                let entry = Installed {
                    mapping: mapping.clone(),
                    connection,
                    local_address: local,
                    lease,
                    renew_at: Instant::now() + self.options.renewal_interval,
                };
                if let Some(index) = old {
                    self.installed[index] = entry;
                } else {
                    self.installed.push(entry);
                }
            }
            Err(error) => {
                if matches!(error, NetworkError::Transport(_)) {
                    self.connection = None;
                }
                self.fail(mapping.key(), Operation::Add, &error);
            }
        }
        true
    }

    async fn remove(&mut self, index: usize) {
        let entry = &self.installed[index];
        let key = entry.mapping.key();
        let operation = Operation::Remove(entry.connection.address);
        let result = bounded(
            self.options.operation_timeout,
            self.backend
                .remove(&entry.connection.gateway, &entry.mapping),
        )
        .await;
        match result {
            Ok(()) => {
                self.recovered(key, operation);
                self.installed.remove(index);
            }
            Err(error) => self.fail(key, operation, &error),
        }
    }

    fn next_deadline(&self, desired: &[Mapping]) -> Option<Instant> {
        let now = Instant::now();
        let mut deadlines = Vec::new();
        for entry in &self.installed {
            if self.needs_removal(entry, desired) {
                deadlines.push(
                    self.failures
                        .get(&(
                            entry.mapping.key(),
                            Operation::Remove(entry.connection.address),
                        ))
                        .map_or(now, |retry| retry.at),
                );
            }
        }
        for mapping in desired {
            let installed = self
                .current_entry(mapping.key())
                .map(|index| &self.installed[index]);
            if installed.is_some_and(|entry| {
                entry.mapping != *mapping || self.needs_removal(entry, desired)
            }) {
                continue;
            }
            let mut at = installed.map_or(now, |entry| entry.renew_at);
            if let Some(retry) = self.failures.get(&(mapping.key(), Operation::Add)) {
                at = at.max(retry.at);
            }
            if let Some(retry) = &self.discovery_retry {
                at = at.max(retry.at);
            }
            deadlines.push(at);
        }
        deadlines.into_iter().min()
    }

    async fn cleanup(&mut self) {
        // Do not discover or renew while shutting down. Reuse each recorded gateway.
        while !self.installed.is_empty() {
            for index in (0..self.installed.len()).rev() {
                let entry = &self.installed[index];
                if self.ready(
                    entry.mapping.key(),
                    Operation::Remove(entry.connection.address),
                ) {
                    self.remove(index).await;
                }
            }
            if let Some(deadline) = self
                .installed
                .iter()
                .filter_map(|entry| {
                    self.failures
                        .get(&(
                            entry.mapping.key(),
                            Operation::Remove(entry.connection.address),
                        ))
                        .map(|retry| retry.at)
                })
                .min()
            {
                sleep_until(deadline).await;
            }
        }
    }
}

async fn bounded<T>(
    duration: Duration,
    future: impl std::future::Future<Output = Result<T, NetworkError>>,
) -> Result<T, NetworkError> {
    timeout(duration, future)
        .await
        .unwrap_or_else(|_| Err(NetworkError::Transport("request timed out".into())))
}
