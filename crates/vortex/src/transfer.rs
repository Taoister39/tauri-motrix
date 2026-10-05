use crate::{model::Record, DownloadError, DownloadRequest, Engine, Result, TaskState};
use reqwest::{
    header::{HeaderMap, HeaderName, HeaderValue},
    Client, Response,
};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    path::PathBuf,
    time::{Duration, Instant},
};
use tokio::{
    io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt},
    sync::mpsc,
    task::JoinSet,
};
use tokio_util::sync::CancellationToken;

const BLOCK: u64 = 8 * 1024 * 1024;
fn cancelled() -> DownloadError {
    DownloadError::new("cancelled", "Download stopped")
}
fn protocol(message: &str) -> DownloadError {
    DownloadError::new("protocol", message)
}
pub(crate) fn validate_request(request: &DownloadRequest) -> Result<()> {
    let url = reqwest::Url::parse(&request.url).map_err(|_| protocol("Invalid URL"))?;
    if !matches!(url.scheme(), "http" | "https")
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err(protocol("Use an HTTP(S) URL without embedded credentials"));
    }
    headers(request)?;
    Ok(())
}
fn headers(request: &DownloadRequest) -> Result<HeaderMap> {
    let mut headers = HeaderMap::new();
    for (key, value) in &request.headers {
        if matches!(
            key.to_ascii_lowercase().as_str(),
            "range" | "if-range" | "accept-encoding" | "host" | "content-length"
        ) {
            return Err(protocol(
                "Range, If-Range, Accept-Encoding, Host and Content-Length are managed by Vortex",
            ));
        }
        headers.insert(
            HeaderName::from_bytes(key.as_bytes()).map_err(|_| protocol("Invalid header name"))?,
            HeaderValue::from_str(value).map_err(|_| protocol("Invalid header value"))?,
        );
    }
    if let Some(referer) = &request.referer {
        headers.insert(
            reqwest::header::REFERER,
            HeaderValue::from_str(referer).map_err(|_| protocol("Invalid Referer"))?,
        );
    }
    headers.insert(
        reqwest::header::ACCEPT_ENCODING,
        HeaderValue::from_static("identity"),
    );
    Ok(headers)
}
fn header<'a>(response: &'a Response, name: &str) -> Option<&'a str> {
    response.headers().get(name)?.to_str().ok()
}
fn validator(response: &Response) -> Option<String> {
    header(response, "etag")
        .filter(|s| !s.starts_with("W/"))
        .or_else(|| header(response, "last-modified"))
        .map(str::to_owned)
}
fn check_status(response: &Response) -> Result<()> {
    let status = response.status().as_u16();
    if response.status().is_success() {
        if header(response, "content-encoding").is_some_and(|s| !s.eq_ignore_ascii_case("identity"))
        {
            return Err(protocol("Encoded response cannot be safely ranged"));
        }
        return Ok(());
    }
    Err(DownloadError {
        code: format!("http_{status}"),
        message: format!("Server returned HTTP {status}"),
        retryable: matches!(status, 408 | 429 | 500 | 502 | 503 | 504),
        retry_after: header(response, "retry-after").and_then(|s| {
            s.parse().ok().or_else(|| {
                httpdate::parse_http_date(s).ok().map(|date| {
                    date.duration_since(std::time::SystemTime::now())
                        .unwrap_or_default()
                        .as_secs()
                })
            })
        }),
    })
}
fn content_range(value: &str) -> Option<(u64, u64, u64)> {
    let (range, total) = value.strip_prefix("bytes ")?.split_once('/')?;
    let (start, end) = range.split_once('-')?;
    let (start, end, total) = (start.parse().ok()?, end.parse().ok()?, total.parse().ok()?);
    if start > end || end >= total {
        return None;
    }
    Some((start, end, total))
}
pub(crate) fn filename(request: &DownloadRequest, disposition: Option<&str>, id: &str) -> String {
    let extended = disposition.and_then(|d| {
        d.split(';').find_map(|part| {
            part.trim()
                .strip_prefix("filename*=")
                .and_then(|s| {
                    s.strip_prefix("UTF-8''")
                        .or_else(|| s.strip_prefix("utf-8''"))
                })
                .map(|s| {
                    percent_encoding::percent_decode_str(s)
                        .decode_utf8_lossy()
                        .into_owned()
                })
        })
    });
    let response_name = extended.or_else(|| {
        disposition.and_then(|d| {
            d.split(';').find_map(|part| {
                part.trim()
                    .strip_prefix("filename=")
                    .map(|s| s.trim_matches('"').to_owned())
            })
        })
    });
    let url_name = reqwest::Url::parse(&request.url).ok().and_then(|u| {
        u.path_segments().and_then(|mut s| s.next_back()).map(|s| {
            percent_encoding::percent_decode_str(s)
                .decode_utf8_lossy()
                .into_owned()
        })
    });
    let raw = request
        .filename
        .clone()
        .or(response_name)
        .or(url_name)
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| id.into());
    let mut length = 0;
    let cleaned: String = raw
        .chars()
        .map(|c| {
            if c.is_control() || "<>:\"/\\|?*".contains(c) {
                '_'
            } else {
                c
            }
        })
        .take_while(|c| {
            length += c.len_utf8();
            length <= 180
        })
        .collect();
    let cleaned = cleaned.trim_end_matches([' ', '.']);
    let stem = cleaned.split('.').next().unwrap_or("").to_ascii_uppercase();
    if cleaned.is_empty()
        || matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || ((stem.starts_with("COM") || stem.starts_with("LPT"))
            && stem.len() == 4
            && stem.ends_with(['1', '2', '3', '4', '5', '6', '7', '8', '9']))
    {
        format!("_{id}")
    } else {
        cleaned.into()
    }
}
pub(crate) fn temporary_path(r: &Record) -> PathBuf {
    r.request
        .directory
        .join(format!(".vortex-{}.part", r.task.id))
}
pub(crate) fn committed(r: &Record) -> u64 {
    r.chunks
        .iter()
        .enumerate()
        .filter(|(_, done)| **done)
        .map(|(i, _)| BLOCK.min(r.task.total.unwrap_or(0).saturating_sub(i as u64 * BLOCK)))
        .sum()
}
async fn send(
    client: &Client,
    request: &DownloadRequest,
    range: Option<(u64, u64)>,
    condition: Option<&str>,
    cancel: &CancellationToken,
) -> Result<Response> {
    let mut builder = client.get(&request.url).headers(headers(request)?);
    if let Some((a, b)) = range {
        builder = builder.header("Range", format!("bytes={a}-{b}"));
    }
    if let Some(v) = condition {
        builder = builder.header("If-Range", v);
    }
    tokio::select! { _ = cancel.cancelled() => Err(cancelled()), r = builder.send() => Ok(r?) }
}
async fn next(response: &mut Response, cancel: &CancellationToken) -> Result<Option<bytes::Bytes>> {
    tokio::select! { _ = cancel.cancelled() => Err(cancelled()), r = response.chunk() => Ok(r?) }
}

pub(crate) async fn download(
    engine: &Engine,
    client: &Client,
    r: &mut Record,
    connections: usize,
    cancel: &CancellationToken,
) -> Result<()> {
    if r.final_hash.is_some() {
        return finalize(engine, r, cancel, true).await;
    }
    let mut probe = send(client, &r.request, Some((0, 0)), None, cancel).await?;
    // An empty resource can legitimately reject bytes=0-0.
    if probe.status().as_u16() == 416 && header(&probe, "content-range") == Some("bytes */0") {
        probe = send(client, &r.request, None, None, cancel).await?;
    }
    check_status(&probe)?;
    let range = header(&probe, "content-range").and_then(content_range);
    let ranged = probe.status().as_u16() == 206 && range.is_some_and(|(a, b, _)| a == 0 && b == 0);
    let total = if ranged {
        range.map(|(_, _, n)| n)
    } else {
        probe.content_length()
    };
    let identity = validator(&probe);
    let can_split = ranged && identity.is_some();
    if r.task.total != total
        || r.validator != identity
        || !can_split
        || tokio::fs::metadata(temporary_path(r)).await.is_err()
    {
        r.chunks.clear();
        r.task.completed = 0;
    }
    r.task.path = r.request.directory.join(filename(
        &r.request,
        header(&probe, "content-disposition"),
        &r.task.id,
    ));
    r.task.total = total;
    r.validator = identity;
    r.task.state = TaskState::Downloading;
    // Clear durable claims before any destructive reset of the temporary file.
    engine.publish(r, true).await?;
    let path = temporary_path(r);
    let file = tokio::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(r.chunks.is_empty())
        .open(&path)
        .await?;
    if can_split {
        let size = total.unwrap();
        // Refuse a checkpoint whose backing file was truncated externally.
        if file.metadata().await?.len() != size {
            r.chunks.clear();
            r.task.completed = 0;
            engine.publish(r, true).await?;
        }
        let count = size.div_ceil(BLOCK) as usize;
        if count > 1_000_000 {
            return Err(protocol(
                "Resource exceeds Vortex's supported segment count",
            ));
        }
        if r.chunks.len() != count {
            r.chunks = vec![false; count];
            engine.publish(r, true).await?;
        }
        file.set_len(size).await?;
        file.sync_all().await?;
        r.task.completed = committed(r);
        r.task.connections = connections.min(count);
        engine.publish(r, true).await?;
        drop(file);
        drop(probe);
        let result = ranges(engine, client, r, connections, cancel).await;
        if result
            .as_ref()
            .err()
            .is_some_and(|e| e.code == "range_changed")
        {
            // All segment writers have stopped. Re-fetch the entire representation.
            r.chunks.clear();
            r.validator = None;
            r.task.completed = 0;
            let response = send(client, &r.request, None, None, cancel).await?;
            stream(engine, r, response, cancel).await?;
        } else {
            result?;
        }
    } else {
        drop(file);
        let response = if probe.status().as_u16() == 206 {
            send(client, &r.request, None, None, cancel).await?
        } else {
            probe
        };
        stream(engine, r, response, cancel).await?;
    }
    r.final_hash = Some(hash(&path, cancel).await?);
    engine.publish(r, true).await?;
    finalize(engine, r, cancel, false).await
}

async fn stream(
    engine: &Engine,
    r: &mut Record,
    mut response: Response,
    cancel: &CancellationToken,
) -> Result<()> {
    check_status(&response)?;
    if response.status().as_u16() != 200 {
        return Err(protocol("Expected a complete HTTP 200 response"));
    }
    r.task.total = response.content_length();
    r.task.completed = 0;
    r.task.connections = 1;
    r.chunks.clear();
    engine.publish(r, true).await?;
    let mut file = tokio::fs::File::create(temporary_path(r)).await?;
    let started = Instant::now();
    let mut notified = Instant::now();
    while let Some(bytes) = next(&mut response, cancel).await? {
        file.write_all(&bytes).await?;
        r.task.completed += bytes.len() as u64;
        if notified.elapsed() >= Duration::from_millis(250) {
            r.task.speed =
                (r.task.completed as f64 / started.elapsed().as_secs_f64().max(0.001)) as u64;
            engine.publish(r, false).await?;
            notified = Instant::now();
        }
    }
    if r.task.total.is_some_and(|n| n != r.task.completed) {
        return Err(protocol("Response length does not match Content-Length"));
    }
    file.sync_all().await?;
    r.task.total = Some(r.task.completed);
    Ok(())
}

async fn ranges(
    engine: &Engine,
    client: &Client,
    r: &mut Record,
    connections: usize,
    cancel: &CancellationToken,
) -> Result<()> {
    let token = cancel.child_token();
    let (tx, mut rx) = mpsc::channel::<(usize, u64)>(32);
    let mut jobs = JoinSet::new();
    let mut pending = r
        .chunks
        .iter()
        .enumerate()
        .filter(|(_, v)| !**v)
        .map(|(i, _)| i)
        .collect::<Vec<_>>()
        .into_iter();
    let mut partial = BTreeMap::new();
    let started = Instant::now();
    let initial = committed(r);
    let mut notified = Instant::now();
    let mut failure = None;
    loop {
        while jobs.len() < connections && failure.is_none() && !token.is_cancelled() {
            let Some(index) = pending.next() else {
                break;
            };
            let (client, request, path, identity, token, tx) = (
                client.clone(),
                r.request.clone(),
                temporary_path(r),
                r.validator.clone().unwrap(),
                token.clone(),
                tx.clone(),
            );
            let total = r.task.total.unwrap();
            jobs.spawn(async move {
                let start = index as u64 * BLOCK;
                let end = (start + BLOCK).min(total) - 1;
                let mut response = send(
                    &client,
                    &request,
                    Some((start, end)),
                    Some(&identity),
                    &token,
                )
                .await?;
                if response.status().as_u16() == 416 {
                    return Err(DownloadError::new(
                        "range_changed",
                        "Server rejected the saved range",
                    ));
                }
                check_status(&response)?;
                if response.status().as_u16() != 206
                    || header(&response, "content-range").and_then(content_range)
                        != Some((start, end, total))
                    || validator(&response).as_deref() != Some(&identity)
                {
                    return Err(DownloadError::new(
                        "range_changed",
                        "Server changed or ignored the requested range",
                    ));
                }
                let mut file = tokio::fs::OpenOptions::new().write(true).open(path).await?;
                file.seek(std::io::SeekFrom::Start(start)).await?;
                let mut written = 0;
                while let Some(bytes) = next(&mut response, &token).await? {
                    if written + bytes.len() as u64 > end - start + 1 {
                        return Err(protocol("Segment exceeds requested range"));
                    }
                    file.write_all(&bytes).await?;
                    written += bytes.len() as u64;
                    let _ = tx.try_send((index, written));
                }
                if written != end - start + 1 {
                    return Err(DownloadError {
                        retryable: true,
                        ..protocol("Incomplete range response")
                    });
                }
                file.sync_all().await?;
                Ok::<_, DownloadError>(index)
            });
        }
        if jobs.is_empty() {
            break;
        }
        tokio::select! {
            result = jobs.join_next() => {
                match result.unwrap() {
                    Ok(Ok(index)) => {
                        r.chunks[index] = true;
                        partial.remove(&index);
                        r.task.completed = committed(r) + partial.values().sum::<u64>();
                        if let Err(e) = engine.publish(r,true).await { failure = Some(e); token.cancel(); }
                    },
                    Ok(Err(e)) => { if failure.is_none() { failure = Some(e); } token.cancel(); },
                    Err(_) => { failure = Some(DownloadError::new("worker","Segment worker failed")); token.cancel(); },
                }
            },
            Some((index,bytes)) = rx.recv() => {
                if !r.chunks[index] { partial.insert(index,bytes); }
                if notified.elapsed() >= Duration::from_millis(250) && failure.is_none() {
                    r.task.completed = committed(r) + partial.values().sum::<u64>();
                    r.task.speed = (r.task.completed.saturating_sub(initial) as f64 / started.elapsed().as_secs_f64().max(0.001)) as u64;
                    if let Err(e) = engine.publish(r,false).await { failure = Some(e); token.cancel(); }
                    notified = Instant::now();
                }
            }
        }
    }
    r.task.completed = committed(r);
    if let Some(e) = failure {
        return Err(e);
    }
    if cancel.is_cancelled() {
        return Err(cancelled());
    }
    Ok(())
}
async fn hash(path: &std::path::Path, cancel: &CancellationToken) -> Result<String> {
    let mut file = tokio::fs::File::open(path).await?;
    let mut digest = Sha256::new();
    let mut buffer = vec![0; 65536];
    loop {
        if cancel.is_cancelled() {
            return Err(cancelled());
        }
        let n = file.read(&mut buffer).await?;
        if n == 0 {
            break;
        }
        digest.update(&buffer[..n]);
    }
    Ok(format!("{:x}", digest.finalize()))
}
async fn finalize(
    engine: &Engine,
    r: &mut Record,
    cancel: &CancellationToken,
    recovering: bool,
) -> Result<()> {
    let temp = temporary_path(r);
    let expected = r.final_hash.as_ref().unwrap().clone();
    // After a crash the link may already exist while the database still says finalizing.
    if recovering
        && tokio::fs::try_exists(&r.task.path).await?
        && hash(&r.task.path, cancel).await? == expected
    {
        r.task.state = TaskState::Complete;
    } else {
        if hash(&temp, cancel).await? != expected {
            return Err(protocol("Temporary file changed before finalization"));
        }
        let original = r.task.path.clone();
        let stem = original.file_stem().unwrap_or_default().to_string_lossy();
        let extension = original
            .extension()
            .map(|e| format!(".{}", e.to_string_lossy()))
            .unwrap_or_default();
        let mut suffix = 0;
        loop {
            engine.publish(r, true).await?;
            let source = temp.clone();
            let destination = r.task.path.clone();
            let moved = tokio::task::spawn_blocking(move || {
                let mut path = tempfile::TempPath::from_path(source);
                // A failed no-clobber rename must retain the resumable source.
                path.disable_cleanup(true);
                path.persist_noclobber(destination).map_err(|e| e.error)
            })
            .await
            .map_err(|_| DownloadError::new("worker", "File finalization worker failed"))?;
            match moved {
                Ok(()) => break,
                Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                    suffix += 1;
                    r.task.path = original.with_file_name(format!("{stem} ({suffix}){extension}"));
                }
                Err(e) => return Err(e.into()),
            }
        }
        r.task.state = TaskState::Complete;
    }
    #[cfg(unix)]
    tokio::fs::File::open(&r.request.directory)
        .await?
        .sync_all()
        .await?;
    r.task.completed = r.task.total.unwrap_or(r.task.completed);
    r.task.speed = 0;
    r.task.connections = 0;
    r.task.error = None;
    engine.publish(r, true).await?;
    match tokio::fs::remove_file(temp).await {
        Ok(()) => (),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => (),
        Err(_) => (), // Completed file remains authoritative.
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn range_requires_valid_boundaries() {
        assert_eq!(content_range("bytes 0-3/4"), Some((0, 3, 4)));
        for value in ["bytes 0-4/4", "bytes 3-1/4", "bytes 0-0/*", "items 0-0/1"] {
            assert_eq!(content_range(value), None);
        }
    }
    #[test]
    fn filenames_cannot_escape_the_directory() {
        let request = DownloadRequest {
            url: "https://example.test/file".into(),
            directory: PathBuf::new(),
            filename: Some("../CON:evil.exe".into()),
            headers: BTreeMap::new(),
            referer: None,
        };
        assert_eq!(filename(&request, None, "id"), ".._CON_evil.exe");
        assert_eq!(
            filename(
                &DownloadRequest {
                    filename: Some("CON.txt".into()),
                    ..request
                },
                None,
                "id"
            ),
            "_id"
        );
    }
}
