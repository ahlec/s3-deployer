export type IgnoreReason = {
  isDefaultRule: boolean;
  globPattern: string;
};

export type Asset = {
  bucketKey: string;
  contentType: string;
  getContents: () => Promise<Buffer>;
  isIgnored: IgnoreReason | false;
};
