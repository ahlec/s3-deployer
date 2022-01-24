import chalk from "chalk";
import md5 from "md5";
import {
  HeadObjectCommand,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import type { Options } from "../types";

import type { Asset } from "./types";
import { makeAssetLogger } from "./AssetLogger";

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
  const logger = makeAssetLogger();

  // If this file is ignored, write it out and then move on
  if (asset.isIgnored) {
    logger({
      assetName: asset.bucketKey,
      details: [
        chalk.dim(
          `Rule '${asset.isIgnored.globPattern}'${
            asset.isIgnored.isDefaultRule ? " (default rule)" : ""
          }`
        ),
      ],
      statusBadge: {
        chalk: chalk.bold.bgGray,
        text: "IGNORED",
      },
    });

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
    logger({
      assetName: asset.bucketKey,
      details: [],
      statusBadge: {
        chalk: chalk.bold.bgHex("#394253"),
        text: "SKIPPED",
      },
    });

    return {
      shouldInvalidateCloudfront: false,
    };
  }

  // Handle dry runs
  if (options.dryRun) {
    logger({
      assetName: asset.bucketKey,
      details: [],
      statusBadge: {
        chalk: chalk.bold.bgHex("#F2CA5F"),
        text: "DRY RUN",
      },
    });

    return {
      shouldInvalidateCloudfront: true,
    };
  }

  // Upload the file
  logger({
    assetName: asset.bucketKey,
    details: [],
    statusBadge: {
      chalk: chalk.bold.bgHex("#f1ca81").hex("#000"),
      text: "WORKING..",
    },
  });

  try {
    await s3Client.send(
      new PutObjectCommand({
        ACL: asset.acl,
        Body: contents,
        Bucket: options.bucket.name,
        CacheControl: asset.cacheControl,
        ContentType: asset.contentType,
        Key: asset.bucketKey,
      })
    );

    logger({
      assetName: asset.bucketKey,
      details: [],
      statusBadge: {
        chalk: chalk.bold.bgHex("#9cbf87").hex("#000"),
        text: "UPLOADED",
      },
    });

    return { shouldInvalidateCloudfront: true };
  } catch {
    logger({
      assetName: asset.bucketKey,
      details: [],
      statusBadge: {
        chalk: chalk.bold.bgHex("#cd5a68"),
        text: "ERROR",
      },
    });

    return {
      shouldInvalidateCloudfront: false,
    };
  }
}
