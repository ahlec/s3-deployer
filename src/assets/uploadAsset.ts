import chalk from "chalk";
import md5 from "md5";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import type { Options } from "../types";

import type { Asset } from "./types";
import { makeAssetLogger } from "./AssetLogger";
import { checkDeployedAsset, DeployedAssetStatus } from "./checkDeployedAsset";

type ShouldUploadResult = {
  ruling: boolean;
  output: readonly string[];
};

function shouldUploadAsset(
  asset: Asset,
  assetContents: Buffer,
  deployedStatus: DeployedAssetStatus
): ShouldUploadResult {
  if (!deployedStatus.exists) {
    return {
      output: [],
      ruling: true,
    };
  }

  // Compute the ETag, which for PutObject on AWS is the MD5 hash of the Body
  // NOTE: AWS stores it as a string wrapped in double quotes
  const eTag = `"${md5(assetContents)}"`;

  // Compare the ETag
  if (eTag !== deployedStatus.eTag) {
    return {
      output: [
        chalk.yellow(
          `Deployed ETag (${chalk.dim(
            deployedStatus.eTag
          )}) differs from current ETag (${chalk.dim(eTag)})`
        ),
      ],
      ruling: true,
    };
  }

  const eTagMessage = `Deployed ETag matches current ETag (${chalk.dim(eTag)})`;

  // Compare the Cache-Control header
  if (asset.cacheControl !== deployedStatus.cacheControl) {
    return {
      output: [
        eTagMessage,
        chalk.yellow(
          `Deployed Cache-Control (${chalk.dim(
            deployedStatus.cacheControl
          )}) differs from current Cache-Control (${chalk.dim(
            asset.cacheControl
          )})`
        ),
      ],
      ruling: true,
    };
  }

  // Asset doesn't need to be reuploaded
  return {
    output: [
      eTagMessage,
      `Deployed Cache-Control matches current Cache-Control (${chalk.dim(
        asset.cacheControl
      )})`,
      "No change detected for asset, so re-upload isn't deemed necessary.",
    ],
    ruling: false,
  };
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

  // Retrieve information on the currently deployed version of this asset, if
  // it exists
  const existingStatus = await checkDeployedAsset(
    s3Client,
    options.bucket.name,
    asset.bucketKey
  );

  // Determine if we should upload the file right now
  const shouldUpload = shouldUploadAsset(asset, contents, existingStatus);
  if (!shouldUpload.ruling) {
    logger({
      assetName: asset.bucketKey,
      details: shouldUpload.output,
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
      details: shouldUpload.output,
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
    details: shouldUpload.output,
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
      details: shouldUpload.output,
      statusBadge: {
        chalk: chalk.bold.bgHex("#9cbf87").hex("#000"),
        text: "UPLOADED",
      },
    });

    return { shouldInvalidateCloudfront: true };
  } catch {
    logger({
      assetName: asset.bucketKey,
      details: shouldUpload.output,
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
