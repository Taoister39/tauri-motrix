# upnp-mapping

Best-effort IPv4 port mappings using `igd-next`'s Tokio API. The crate owns one
serial background worker and has no Tauri or application configuration dependency.

```rust
use upnp_mapping::{Mapping, Options, PortMappingProtocol, UpnpManager};

// Call from an existing Tokio runtime.
let manager = UpnpManager::start(Options::default())?;
manager.update(vec![Mapping {
    protocol: PortMappingProtocol::TCP,
    external_port: 21301,
    internal_port: 21301,
    local_address: None, // Select the IPv4 route to the discovered gateway.
    description: "My application BT".into(),
}])?;

// Each update replaces the complete desired set without waiting for network I/O.
manager.update(Vec::new())?; // Disable mappings; failed deletion is retried.
manager.shutdown().await?; // Stop the worker and wait for bounded cleanup.
```

Defaults: 5-second discovery/request timeouts, 3600-second leases renewed every
1800 seconds, retries after 5/10/20/40/60 seconds, and a 3-second shutdown budget.
Only an explicit `OnlyPermanentLeasesSupported` response triggers a permanent
lease fallback. Permanent mappings are periodically reasserted too.

Identical configurations do not recreate mappings. Partial failures are retried
independently; conflicts are never resolved by deleting another client's mapping
or choosing an arbitrary external port. Cleanup retains each successfully used
gateway, including after a network change. Errors and recovery are emitted through
`log` under the `upnp_mapping` target.

Call `shutdown` before exiting. Dropping the manager requests bounded cleanup but
does not wait. Network timeouts, lost responses, and abrupt exits can leave mappings
behind; permanent leases do not expire automatically. Mapping a port does not
configure the application's listener or guarantee public reachability.
