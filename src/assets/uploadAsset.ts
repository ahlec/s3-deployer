import chalk from "chalk";
import md5 from "md5";
import {
  HeadObjectCommand,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import type { Options } from "../types";

import type { Asset } from "./types";
import WhiteboardConsole from "./WhiteboardConsole";

async function shouldUploadFile(
  client: S3Client,
  bucketName: string,
  key: string,
  eTag: string
): Promise<boolean> {
  try {
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    return head.ETag !== eTag;
  } catch (e) {
    if (e.name === "NotFound") {
      return true;
    }

    console.log(e);
    return true;
  }
}

type UploadResult = {
  shouldInvalidateCloudfront: boolean;
};

export async function uploadAsset(
  s3Client: S3Client,
  options: Options,
  asset: Asset
): Promise<UploadResult> {
  const logger = WhiteboardConsole();

  // If this file is ignored, write it out and then move on
  if (asset.isIgnored) {
    logger(`${chalk.bold("  IGNORED ")} ${chalk.dim(asset.bucketKey)}`);

    return {
      shouldInvalidateCloudfront: false,
    };
  }

  // Read the current contents of the file
  const contents = await asset.getContents();

  // Compute the ETag, which for PutObject on AWS is the MD5 hash of the Body
  // NOTE: AWS stores it as a string wrapped in double quotes
  const eTag = `"${md5(contents)}"`;

  // Determine if we should upload the file right now
  const shouldUpload = await shouldUploadFile(
    s3Client,
    options.bucket.name,
    asset.bucketKey,
    eTag
  );
  if (!shouldUpload) {
    logger(
      `${chalk.bold.bgHex("#394253")("  SKIPPED ")} ${chalk.dim(
        asset.bucketKey
      )}`
    );

    return {
      shouldInvalidateCloudfront: false,
    };
  }

  // Handle dry runs
  if (options.dryRun) {
    logger(`${chalk.bold.bgHex("#F2CA5F")("  Dry Run ")} ${asset.bucketKey}`);

    return {
      shouldInvalidateCloudfront: true,
    };
  }

  // Upload the file
  logger(
    `${chalk.bold.bgHex("#f1ca81").hex("#000")("WORKING.. ")} ${
      asset.bucketKey
    }`
  );

  try {
    await s3Client.send(
      new PutObjectCommand({
        ACL: "public-read",
        Body: contents,
        Bucket: options.bucket.name,
        CacheControl: "max-age=315360000, no-transform, public",
        ContentType: asset.contentType,
        Key: asset.bucketKey,
      })
    );

    logger(
      `${chalk.bold.bgHex("#9cbf87").hex("#000")(" UPLOADED ")} ${
        asset.bucketKey
      }`
    );

    return { shouldInvalidateCloudfront: true };
  } catch {
    logger(`${chalk.bold.bgHex("#cd5a68")("    ERROR ")} ${asset.bucketKey}`);

    return {
      shouldInvalidateCloudfront: false,
    };
  }
}
