import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type DeployedAssetStatus =
  | {
      exists: false;
    }
  | {
      exists: true;

      cacheControl: string;
      eTag: string;
      metadata: { [key: string]: string };
    };

export async function checkDeployedAsset(
  client: S3Client,
  bucketName: string,
  key: string
): Promise<DeployedAssetStatus> {
  try {
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    return {
      cacheControl: head.CacheControl || "",
      eTag: head.ETag || "",
      exists: true,
      metadata: head.Metadata || {},
    };
  } catch (e) {
    if (e.name === "NotFound") {
      return {
        exists: false,
      };
    }

    throw e;
  }
}
