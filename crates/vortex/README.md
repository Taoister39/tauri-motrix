# Vortex

Standalone HTTP(S) download library used by Tauri Motrix. The crate has no Tauri
dependency. Media discovery, cloud-provider login, URL refresh and post-processing
belong above this transport layer.

```sh
cargo run -p tauri-motrix-vortex --example download -- https://example.com/file ./downloads
```

The example uses `.vortex` for persistent state. Call `Engine::open` with a stable
state directory and an `EngineConfig`, then `add`, `get`/`list`, `pause`, `resume`,
`retry` or `remove`. Always await `shutdown` before exiting. Subscribe to
`TaskEvent` for immediate changes; on broadcast lag, fetch a fresh snapshot.
Snapshots include monotonically increasing per-task revisions. Progress events
are throttled to 250 ms; state transitions are immediate.

## Reliability model

- Defaults: three FIFO tasks, four connections per task, 8 MiB segments. Connections
  are bounded, and each network reader awaits its file writes (backpressure).
- A real range request determines range support. Segmentation/resumption requires
  a known length and a strong ETag, or Last-Modified plus length. Every range response
  is checked. Changed resources and ignored ranges cannot be combined with old data.
- Each completed segment is synchronized to disk before its SQLite checkpoint.
  Uncommitted segments are downloaded again after interruption. Servers without
  safe range support use a single stream and restart from zero when interrupted.
- Finalization stores a SHA-256 digest before a no-clobber file move. Recovery handles
  interruption before/after the move, without overwriting unrelated files. The digest
  validates local finalization; it is not a publisher-supplied integrity check.
- Previously running/queued tasks automatically resume. Paused and failed tasks stay
  stopped. Removing a task deletes its temporary data and keeps completed output.
- Transient network failures and HTTP 408/429/500/502/503/504 retry at most three times.
  Retry-After (seconds or HTTP date) takes precedence over exponential backoff.
- One engine can own a state directory. SQLite stores versioned task records including
  the request headers needed for resumption; callers should use their private app-data
  directory. Events exclude request headers and network errors omit request URLs.

## Motrix integration

Settings → Vortex selects the engine for new HTTP(S) tasks; the default is aria2.
Existing tasks keep their engine. BT, magnet links, other protocols and external
aria2 RPC clients keep using aria2. Switching back does not cancel Vortex tasks.
Concurrency settings take effect on application restart. Vortex's automatic recovery
is independent of the aria2 “resume at startup” preference.

The frontend adapter provides task identity `{ engine, id }`, capabilities and existing
presentation fields. The `gid` presentation key prefixes Vortex IDs with `vortex:`;
legacy aria2 IDs stay unchanged. History queries use both engine and native ID.

Not included: mirrors, proxy configuration, bandwidth limits, BT, media pipelines,
remote RPC, or aria2 resume-file import. Unsupported per-task options are rejected.
This release does not promise higher throughput than aria2. Unknown lengths use
indeterminate progress. Retryable failures and filesystem errors remain visible.

## Verification

Use Node >=22 and pnpm 10.12.4 as specified by the root manifest. Run `pnpm build`
before tests, then:

```sh
cargo test -p tauri-motrix-vortex
pnpm test --runInBand tests/download_engine.spec.ts tests/task.test.ts tests/task_delete.spec.ts tests/polling.spec.ts
```

The local HTTP fixture covers range and non-range responses, unknown/empty bodies,
redirects, disconnects, retries, resource changes, paused recovery, removal,
forced process termination and both sides of finalization. The Vortex CI workflow
runs the Rust suite on Windows, Linux and macOS.
