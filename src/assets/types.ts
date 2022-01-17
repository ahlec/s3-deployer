export type IgnoreReason = {
  isDefaultRule: boolean;
  globPattern: string;
};

export type Asset = {
  acl: string;
  bucketKey: string;
  cacheControl: string;
  contentType: string;
  getContents: () => Promise<Buffer>;
  isIgnored: IgnoreReason | false;
};
