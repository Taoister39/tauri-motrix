export type BinaryInput = ArrayBuffer | ArrayBufferView;

export interface BencodeDictionary {
  entries: { key: Uint8Array; value: BencodeValue }[];
}

export type BencodeValue =
  | number
  | bigint
  | Uint8Array
  | BencodeValue[]
  | BencodeDictionary;

export type TorrentHashes =
  | { version: "v1"; infoHash: string; infoHashV2?: never }
  | { version: "v2"; infoHash?: never; infoHashV2: string }
  | { version: "hybrid"; infoHash: string; infoHashV2: string };

export interface MagnetInput {
  infoHash?: string;
  infoHashV2?: string;
  name?: string;
  announce?: string[];
  urlList?: string[];
  peerAddresses?: string[];
  keywords?: string[];
  selectOnly?: number[];
  publicKey?: string;
  parameters?: Record<string, string[]>;
}

export type ParsedTorrentIdentifier = MagnetInput &
  TorrentHashes & {
    kind: "identifier";
    announce: string[];
    urlList: string[];
    peerAddresses: string[];
    parameters: Record<string, string[]>;
  };

export interface TorrentFile {
  name: string;
  path: string;
  length: number;
  offset: number;
  padding?: boolean;
  piecesRoot?: string;
}

export type ParsedTorrentFile = TorrentHashes & {
  kind: "torrent-file";
  name: string;
  announce: string[];
  announceList: string[][];
  urlList: string[];
  files: TorrentFile[];
  length: number;
  pieceLength: number;
  lastPieceLength: number;
  pieces?: string[];
  pieceLayers?: Map<string, Uint8Array>;
  info: BencodeDictionary;
  infoBuffer: Uint8Array;
  metainfo: BencodeDictionary;
  private?: boolean;
  created?: Date;
  createdBy?: string;
  comment?: string;
};

export type ParsedTorrent = ParsedTorrentIdentifier | ParsedTorrentFile;
export type TorrentInput =
  | string
  | BinaryInput
  | Blob
  | MagnetInput
  | ParsedTorrent;

export interface ParsedPeerId {
  client: string;
  version?: string;
}
