export type Asset = {
  bucketKey: string;
  contentType: string;
  getContents: () => Promise<Buffer>;
  isIgnored: boolean;
};
