export type Asset = {
  bucketKey: string;
  contentType: string;
  getContents: () => Promise<Buffer>;
  isIgnored: boolean;
};

export type AssetState =
  | "skipped"
  | "uploading"
  | "uploaded"
  | "error"
  | "ignored";
