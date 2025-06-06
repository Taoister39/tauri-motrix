export const parseTorrent = (torrent: object) => {
  if (ArrayBuffer.isView(torrent) && torrent.byteLength === 20) {
    // if info hash (buffer)
  } else if (ArrayBuffer.isView(torrent)) {
    // if .torrent file (buffer)
    return decodeTorrentFile(torrent);
  } else {
    throw new Error("Invalid torrent identifier");
  }
};

async function decodeTorrentFile(torrent: object) {
  if (ArrayBuffer.isView(torrent)) {
    // torrent = bencode.decode(torrent);
  }
}
