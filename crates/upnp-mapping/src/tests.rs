use std::{
    collections::{BTreeMap, VecDeque},
    net::Ipv4Addr,
    sync::{Arc, Mutex},
    time::Duration,
};

use tokio::sync::oneshot;

use super::*;
use crate::backend::{Backend, Connection, NetworkError};

#[derive(Clone, Debug, PartialEq, Eq)]
enum Call {
    Discover(u8),
    Add {
        gateway: u8,
        port: u16,
        lease: u32,
        local: Ipv4Addr,
    },
    Remove(u8, u16),
}

struct State {
    calls: Vec<Call>,
    gateway: u8,
    local: Ipv4Addr,
    discover_errors: VecDeque<NetworkError>,
    add_errors: BTreeMap<u16, VecDeque<NetworkError>>,
    remove_errors: VecDeque<NetworkError>,
    permanent_only: bool,
    add_gate: Option<oneshot::Receiver<()>>,
    hang_remove: bool,
}

impl Default for State {
    fn default() -> Self {
        Self {
            calls: Vec::new(),
            gateway: 1,
            local: Ipv4Addr::new(192, 168, 1, 20),
            discover_errors: VecDeque::new(),
            add_errors: BTreeMap::new(),
            remove_errors: VecDeque::new(),
            permanent_only: false,
            add_gate: None,
            hang_remove: false,
        }
    }
}

#[derive(Clone, Default)]
struct Fake(Arc<Mutex<State>>);

impl Fake {
    fn calls(&self) -> Vec<Call> {
        self.0.lock().unwrap().calls.clone()
    }
    fn manager(&self) -> UpnpManager {
        UpnpManager::with_backend(Options::default(), self.clone()).unwrap()
    }
}

impl Backend for Fake {
    type Gateway = u8;

    async fn discover(&mut self, _: Duration) -> Result<Connection<u8>, NetworkError> {
        let mut state = self.0.lock().unwrap();
        let gateway = state.gateway;
        state.calls.push(Call::Discover(gateway));
        if let Some(error) = state.discover_errors.pop_front() {
            return Err(error);
        }
        Ok(Connection {
            gateway,
            address: ([192, 168, 1, gateway], 80).into(),
            local_address: state.local,
        })
    }

    async fn add(
        &mut self,
        gateway: &u8,
        mapping: &Mapping,
        local: Ipv4Addr,
        lease: u32,
    ) -> Result<(), NetworkError> {
        let (result, gate) = {
            let mut state = self.0.lock().unwrap();
            state.calls.push(Call::Add {
                gateway: *gateway,
                port: mapping.external_port,
                lease,
                local,
            });
            let result = if state.permanent_only && lease != 0 {
                Err(NetworkError::PermanentOnly)
            } else {
                state
                    .add_errors
                    .get_mut(&mapping.external_port)
                    .and_then(VecDeque::pop_front)
                    .map_or(Ok(()), Err)
            };
            (result, state.add_gate.take())
        };
        if let Some(gate) = gate {
            let _ = gate.await;
        }
        result
    }

    async fn remove(&mut self, gateway: &u8, mapping: &Mapping) -> Result<(), NetworkError> {
        let (result, hang) = {
            let mut state = self.0.lock().unwrap();
            state
                .calls
                .push(Call::Remove(*gateway, mapping.external_port));
            (
                state.remove_errors.pop_front().map_or(Ok(()), Err),
                state.hang_remove,
            )
        };
        if hang {
            std::future::pending::<()>().await;
        }
        result
    }
}

fn mapping(port: u16) -> Mapping {
    Mapping {
        protocol: PortMappingProtocol::TCP,
        external_port: port,
        internal_port: port,
        local_address: None,
        description: "test".into(),
    }
}

async fn settle() {
    // Keep the test runnable so paused time does not automatically jump to renewal.
    for _ in 0..20 {
        tokio::task::yield_now().await;
    }
}

fn add_count(fake: &Fake, port: u16) -> usize {
    fake.calls()
        .iter()
        .filter(|call| matches!(call, Call::Add { port: actual, .. } if *actual == port))
        .count()
}

#[test]
fn validates_ports_addresses_and_duplicate_keys() {
    assert_eq!(
        validate(vec![mapping(0)]),
        Err(Error::InvalidMapping("ports must be nonzero"))
    );
    let mut invalid = mapping(1);
    invalid.internal_port = 0;
    assert!(validate(vec![invalid]).is_err());
    for ip in [
        Ipv4Addr::UNSPECIFIED,
        Ipv4Addr::LOCALHOST,
        Ipv4Addr::BROADCAST,
        Ipv4Addr::new(224, 0, 0, 1),
    ] {
        let mut invalid = mapping(1);
        invalid.local_address = Some(ip);
        assert!(validate(vec![invalid]).is_err());
    }
    assert_eq!(
        validate(vec![mapping(1), mapping(1)]).unwrap(),
        vec![mapping(1)]
    );
    let mut conflicting = mapping(1);
    conflicting.internal_port = 2;
    assert!(validate(vec![mapping(1), conflicting]).is_err());
    let mut udp = mapping(1);
    udp.protocol = PortMappingProtocol::UDP;
    assert_eq!(validate(vec![mapping(1), udp]).unwrap().len(), 2);
}

#[test]
fn requires_runtime_and_valid_options() {
    assert!(matches!(
        UpnpManager::start(Options::default()),
        Err(Error::NoRuntime)
    ));
    assert!(matches!(
        UpnpManager::start(Options {
            lease_duration: 0,
            ..Options::default()
        }),
        Err(Error::InvalidOptions)
    ));
}

#[tokio::test(start_paused = true)]
async fn reconciles_only_changes_and_shutdown_is_idempotent() {
    let fake = Fake::default();
    let manager = fake.manager();
    manager.update(vec![mapping(1), mapping(2)]).unwrap();
    settle().await;
    let initial = fake.calls();
    manager
        .update(vec![mapping(2), mapping(1), mapping(1)])
        .unwrap();
    settle().await;
    assert_eq!(fake.calls(), initial);
    manager.update(vec![mapping(2), mapping(3)]).unwrap();
    settle().await;
    assert_eq!(add_count(&fake, 2), 1);
    assert!(fake.calls().contains(&Call::Remove(1, 1)));
    assert_eq!(add_count(&fake, 3), 1);
    let (first, second) = tokio::join!(manager.shutdown(), manager.shutdown());
    assert_eq!((first, second), (Ok(()), Ok(())));
    assert_eq!(manager.shutdown().await, Ok(()));
    assert_eq!(manager.update(Vec::new()), Err(Error::Closed));
    assert_eq!(
        fake.calls()
            .iter()
            .filter(|call| **call == Call::Remove(1, 2))
            .count(),
        1
    );
}

#[tokio::test(start_paused = true)]
async fn endpoint_change_waits_for_old_mapping_removal_on_same_gateway() {
    let fake = Fake::default();
    let manager = fake.manager();
    manager.update(vec![mapping(1)]).unwrap();
    settle().await;
    fake.0
        .lock()
        .unwrap()
        .remove_errors
        .push_back(NetworkError::Transport("temporarily offline".into()));
    let mut changed = mapping(1);
    changed.internal_port = 2;
    manager.update(vec![changed]).unwrap();
    settle().await;
    assert_eq!(add_count(&fake, 1), 1);
    tokio::time::advance(Duration::from_secs(5)).await;
    settle().await;
    assert_eq!(add_count(&fake, 1), 2);
    let calls = fake.calls();
    let removal = calls
        .iter()
        .rposition(|call| *call == Call::Remove(1, 1))
        .unwrap();
    let addition = calls
        .iter()
        .rposition(|call| matches!(call, Call::Add { .. }))
        .unwrap();
    assert!(removal < addition);
    manager.shutdown().await.unwrap();
}

#[tokio::test(start_paused = true)]
async fn retries_failed_mapping_without_recreating_successful_mapping() {
    let fake = Fake::default();
    fake.0.lock().unwrap().add_errors.insert(
        2,
        VecDeque::from([NetworkError::Rejected("port in use".into())]),
    );
    let manager = fake.manager();
    manager.update(vec![mapping(1), mapping(2)]).unwrap();
    settle().await;
    assert_eq!(add_count(&fake, 1), 1);
    assert_eq!(add_count(&fake, 2), 1);
    tokio::time::advance(Duration::from_secs(4)).await;
    settle().await;
    assert_eq!(add_count(&fake, 2), 1);
    tokio::time::advance(Duration::from_secs(1)).await;
    settle().await;
    assert_eq!(add_count(&fake, 1), 1);
    assert_eq!(add_count(&fake, 2), 2);
    manager.shutdown().await.unwrap();
}

#[tokio::test(start_paused = true)]
async fn backs_off_discovery_and_caps_delay() {
    let fake = Fake::default();
    fake.0.lock().unwrap().discover_errors = (0..7)
        .map(|_| NetworkError::Transport("offline".into()))
        .collect();
    let manager = fake.manager();
    manager.update(vec![mapping(1)]).unwrap();
    settle().await;
    for delay in [5, 10, 20, 40, 60, 60, 60] {
        let count = fake.calls().len();
        tokio::time::advance(Duration::from_secs(delay - 1)).await;
        settle().await;
        assert_eq!(fake.calls().len(), count);
        tokio::time::advance(Duration::from_secs(1)).await;
        settle().await;
        assert!(fake.calls().len() > count);
    }
    assert_eq!(add_count(&fake, 1), 1);
    manager.shutdown().await.unwrap();
}

#[tokio::test(start_paused = true)]
async fn renews_and_remembers_permanent_lease_fallback() {
    let fake = Fake::default();
    fake.0.lock().unwrap().permanent_only = true;
    let manager = fake.manager();
    manager.update(vec![mapping(1)]).unwrap();
    settle().await;
    let leases = || {
        fake.calls()
            .iter()
            .filter_map(|call| {
                if let Call::Add { lease, .. } = call {
                    Some(*lease)
                } else {
                    None
                }
            })
            .collect::<Vec<_>>()
    };
    assert_eq!(leases(), vec![3600, 0]);
    tokio::time::advance(Duration::from_secs(1800)).await;
    settle().await;
    assert_eq!(leases(), vec![3600, 0, 0]);
    manager.shutdown().await.unwrap();
}

#[tokio::test(start_paused = true)]
async fn renewal_rediscovery_migrates_gateway_and_local_address() {
    let fake = Fake::default();
    let manager = fake.manager();
    manager.update(vec![mapping(1)]).unwrap();
    settle().await;
    let new_local = Ipv4Addr::new(192, 168, 1, 30);
    {
        let mut state = fake.0.lock().unwrap();
        state.gateway = 2;
        state.local = new_local;
    }
    tokio::time::advance(Duration::from_secs(1800)).await;
    settle().await;
    assert!(fake.calls().contains(&Call::Remove(1, 1)));
    assert!(fake.calls().contains(&Call::Add {
        gateway: 2,
        port: 1,
        lease: 3600,
        local: new_local
    }));
    manager.shutdown().await.unwrap();
    assert!(fake.calls().contains(&Call::Remove(2, 1)));
}

#[tokio::test(start_paused = true)]
async fn old_gateway_cleanup_failure_does_not_block_new_gateway() {
    let fake = Fake::default();
    let manager = fake.manager();
    manager.update(vec![mapping(1)]).unwrap();
    settle().await;
    {
        let mut state = fake.0.lock().unwrap();
        state.gateway = 2;
        state
            .remove_errors
            .push_back(NetworkError::Transport("old gateway offline".into()));
    }
    tokio::time::advance(Duration::from_secs(1800)).await;
    settle().await;
    assert!(fake.calls().contains(&Call::Add {
        gateway: 2,
        port: 1,
        lease: 3600,
        local: Ipv4Addr::new(192, 168, 1, 20)
    }));
    assert_eq!(
        fake.calls()
            .iter()
            .filter(|call| **call == Call::Remove(1, 1))
            .count(),
        1
    );
    tokio::time::advance(Duration::from_secs(5)).await;
    settle().await;
    assert_eq!(
        fake.calls()
            .iter()
            .filter(|call| **call == Call::Remove(1, 1))
            .count(),
        2
    );
    assert_eq!(add_count(&fake, 1), 2);
    manager.shutdown().await.unwrap();
    assert!(fake.calls().contains(&Call::Remove(2, 1)));
}

#[tokio::test(start_paused = true)]
async fn transport_failure_rediscovers_and_preserves_explicit_local_address() {
    let fake = Fake::default();
    fake.0.lock().unwrap().add_errors.insert(
        1,
        VecDeque::from([NetworkError::Transport("offline".into())]),
    );
    let manager = fake.manager();
    let local = Ipv4Addr::new(192, 168, 1, 50);
    let mut requested = mapping(1);
    requested.local_address = Some(local);
    manager.update(vec![requested]).unwrap();
    settle().await;
    fake.0.lock().unwrap().gateway = 2;
    tokio::time::advance(Duration::from_secs(5)).await;
    settle().await;
    assert!(fake.calls().contains(&Call::Discover(2)));
    assert!(fake.calls().contains(&Call::Add {
        gateway: 2,
        port: 1,
        lease: 3600,
        local
    }));
    manager.shutdown().await.unwrap();
    assert!(!fake.calls().contains(&Call::Remove(1, 1)));
}

#[tokio::test(start_paused = true)]
async fn removal_failure_is_retried_when_disabled() {
    let fake = Fake::default();
    let manager = fake.manager();
    manager.update(vec![mapping(1)]).unwrap();
    settle().await;
    fake.0
        .lock()
        .unwrap()
        .remove_errors
        .push_back(NetworkError::Transport("offline".into()));
    manager.update(Vec::new()).unwrap();
    settle().await;
    assert_eq!(
        fake.calls()
            .iter()
            .filter(|call| **call == Call::Remove(1, 1))
            .count(),
        1
    );
    tokio::time::advance(Duration::from_secs(5)).await;
    settle().await;
    assert_eq!(
        fake.calls()
            .iter()
            .filter(|call| **call == Call::Remove(1, 1))
            .count(),
        2
    );
    tokio::time::advance(Duration::from_secs(1800)).await;
    settle().await;
    assert_eq!(add_count(&fake, 1), 1);
    manager.shutdown().await.unwrap();
}

#[tokio::test(start_paused = true)]
async fn latest_update_wins_after_inflight_add_completes() {
    let fake = Fake::default();
    let (release, gate) = oneshot::channel();
    fake.0.lock().unwrap().add_gate = Some(gate);
    let manager = fake.manager();
    manager.update(vec![mapping(1)]).unwrap();
    settle().await;
    manager.update(vec![mapping(2)]).unwrap();
    manager.update(vec![mapping(3)]).unwrap();
    release.send(()).unwrap();
    settle().await;
    assert!(fake.calls().contains(&Call::Remove(1, 1)));
    assert_eq!(add_count(&fake, 2), 0);
    assert_eq!(add_count(&fake, 3), 1);
    manager.shutdown().await.unwrap();
}

#[tokio::test(start_paused = true)]
async fn disabling_during_add_cleans_up_its_success() {
    let fake = Fake::default();
    let (release, gate) = oneshot::channel();
    fake.0.lock().unwrap().add_gate = Some(gate);
    let manager = fake.manager();
    manager.update(vec![mapping(1)]).unwrap();
    settle().await;
    manager.update(Vec::new()).unwrap();
    release.send(()).unwrap();
    settle().await;
    assert!(fake.calls().contains(&Call::Remove(1, 1)));
    manager.shutdown().await.unwrap();
}

#[tokio::test(start_paused = true)]
async fn shutdown_aborts_hung_cleanup_within_budget() {
    let fake = Fake::default();
    let manager = fake.manager();
    manager.update(vec![mapping(1)]).unwrap();
    settle().await;
    fake.0.lock().unwrap().hang_remove = true;
    let started = tokio::time::Instant::now();
    assert_eq!(manager.shutdown().await, Err(Error::ShutdownTimedOut));
    assert!(started.elapsed() <= Duration::from_secs(3));
    assert_eq!(manager.update(vec![mapping(2)]), Err(Error::Closed));
    settle().await;
    let calls = fake.calls();
    tokio::time::advance(Duration::from_secs(1800)).await;
    settle().await;
    assert_eq!(fake.calls(), calls);
}

#[tokio::test(start_paused = true)]
async fn shutdown_budget_includes_inflight_operation() {
    let fake = Fake::default();
    let (_release, gate) = oneshot::channel();
    fake.0.lock().unwrap().add_gate = Some(gate);
    let manager = fake.manager();
    manager.update(vec![mapping(1)]).unwrap();
    settle().await;
    let started = tokio::time::Instant::now();
    assert_eq!(manager.shutdown().await, Err(Error::ShutdownTimedOut));
    assert!(started.elapsed() <= Duration::from_secs(3));
}

#[tokio::test(start_paused = true)]
async fn dropping_manager_requests_cleanup() {
    let fake = Fake::default();
    let manager = fake.manager();
    manager.update(vec![mapping(1)]).unwrap();
    settle().await;
    drop(manager);
    settle().await;
    assert!(fake.calls().contains(&Call::Remove(1, 1)));
}
