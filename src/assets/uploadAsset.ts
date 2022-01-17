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

const STATUS_BADGE_WIDTH_CHARS = 11;

function statusBadge(text: string, chalk: chalk.Chalk): string {
  let paddedText: string;
  if (text.length > STATUS_BADGE_WIDTH_CHARS) {
    paddedText = text.substring(0, STATUS_BADGE_WIDTH_CHARS);
  } else {
    const remainingSpace = Math.max(0, STATUS_BADGE_WIDTH_CHARS - text.length);
    const leftSide = Math.floor(remainingSpace / 2);
    const rightSide = remainingSpace - leftSide;
    paddedText = `${" ".repeat(leftSide)}${text}${" ".repeat(rightSide)}`;
  }

  return chalk(paddedText);
}

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
    logger(
      `${statusBadge("IGNORED", chalk.bold)} ${chalk.dim(asset.bucketKey)}`
    );

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
      `${statusBadge("SKIPPED", chalk.bold.bgHex("#394253"))} ${chalk.dim(
        asset.bucketKey
      )}`
    );

    return {
      shouldInvalidateCloudfront: false,
    };
  }

  // Handle dry runs
  if (options.dryRun) {
    logger(
      `${statusBadge("DRY RUN", chalk.bold.bgHex("#F2CA5F"))} ${
        asset.bucketKey
      }`
    );

    return {
      shouldInvalidateCloudfront: true,
    };
  }

  // Upload the file
  logger(
    `${statusBadge("WORKING..", chalk.bold.bgHex("#f1ca81").hex("#000"))} ${
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
      `${statusBadge("UPLOADED", chalk.bold.bgHex("#9cbf87").hex("#000"))} ${
        asset.bucketKey
      }`
    );

    return { shouldInvalidateCloudfront: true };
  } catch {
    logger(
      `${statusBadge("ERROR", chalk.bold.bgHex("#cd5a68"))} ${asset.bucketKey}`
    );

    return {
      shouldInvalidateCloudfront: false,
    };
  }
}
