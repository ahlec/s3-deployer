import chalk from "chalk";
import { existsSync, promises } from "fs";
import md5 from "md5";
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";

import type { Asset } from "./assets/types";
import { retrieveAssets } from "./assets/retrieveAssets";
import { writeAsset } from "./assets/writeAsset";

import { confirm, writeLine } from "./console";
import type { Options } from "./types";

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

async function confirmDeployReady(): Promise<boolean> {
  const wantsToDeploy = await confirm(
    "Would you like to deploy the latest build in the build directory?"
  );
  if (!wantsToDeploy) {
    return false;
  }

  const hasRunSynchronize = await confirm(
    `Have you run ${chalk.bold("yarn synchronize")} already?`
  );
  if (!hasRunSynchronize) {
    return false;
  }

  return true;
}

function getRelativeTime(ms: Date): { label: string; isRecent: boolean } {
  const duration = Date.now() - ms.valueOf();
  const ONE_SECOND = 1000;
  const ONE_MINUTE = 60 * ONE_SECOND;
  const ONE_HOUR = 60 * ONE_MINUTE;
  const ONE_DAY = 24 * ONE_HOUR;

  if (duration < ONE_SECOND) {
    return { isRecent: true, label: "just now" };
  }

  if (duration < ONE_MINUTE) {
    const numSecs = Math.round(duration / ONE_SECOND);
    return {
      isRecent: true,
      label: numSecs === 1 ? "1 second ago" : `${numSecs} seconds ago`,
    };
  }

  if (duration < ONE_HOUR) {
    const numMinutes = Math.round(duration / ONE_MINUTE);
    return {
      isRecent: numMinutes < 3,
      label: numMinutes === 1 ? "1 minute ago" : `${numMinutes} minutes ago`,
    };
  }

  if (duration < ONE_DAY) {
    const numHours = Math.round(duration / ONE_HOUR);
    return {
      isRecent: false,
      label: numHours === 1 ? "1 hour ago" : `${numHours} hours ago`,
    };
  }

  const numDays = Math.round(duration / ONE_DAY);
  return {
    isRecent: false,
    label: numDays === 1 ? "1 day ago" : `${numDays} days ago`,
  };
}

export async function runDeploy(options: Options): Promise<void> {
  // Intro into the tool
  writeLine(chalk.bold("Personal Website Release Tool"));
  writeLine("Deploys Alec's personal website to S3");
  writeLine();

  // Output information about the last build
  const doesBuildDirectoryExist = existsSync(options.buildDirAbsolutePath);

  writeLine(
    `${chalk.bold("Build directory:")} ${options.buildDirAbsolutePath}`
  );
  if (!doesBuildDirectoryExist) {
    writeLine(
      `${chalk.red("Directory does not exist.")} Run ${chalk.bold(
        "yarn build"
      )} to generate a build.`
    );
    process.exit(1);
  }

  const buildDirLastModified = (
    await promises.stat(options.buildDirAbsolutePath)
  ).mtime;
  const relativeLastModified = getRelativeTime(buildDirLastModified);
  const lastModifiedChalk = relativeLastModified.isRecent
    ? chalk.white
    : chalk.red;

  writeLine(
    lastModifiedChalk(
      `${chalk.bold("Last modified:")} ${buildDirLastModified.toString()} (${
        relativeLastModified.label
      })`
    )
  );

  writeLine();

  // Perform the pre-deploy confirmation checks
  const readyToDeploy = await confirmDeployReady();
  if (!readyToDeploy) {
    return;
  }

  const assets = await retrieveAssets(options);

  // Perform the initial upload to S3
  writeLine(chalk.bold("Beginning S3 Upload."));
  const s3Client = new S3Client({ region: options.bucket.region });
  const uploadedAssets: Asset[] = [];
  for (const asset of assets) {
    // If this file is ignored, write it out and then move on
    if (asset.isIgnored) {
      writeAsset(asset, "ignored");
      continue;
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
      writeAsset(asset, "skipped");
      continue;
    }

    // Upload the file
    writeAsset(asset, "uploading");
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

      writeAsset(asset, "uploaded");
      uploadedAssets.push(asset);
    } catch {
      writeAsset(asset, "error");
      return; // Stop the process
    }
  }

  // Add a summary for the uploads
  writeLine();
  writeLine(
    `${chalk.bold("S3 Upload Complete.")} ${uploadedAssets.length} ${
      uploadedAssets.length === 1 ? "asset" : "assets"
    } uploaded.`
  );
  if (uploadedAssets.length) {
    uploadedAssets.forEach((asset): void => {
      writeLine(` • ${asset.bucketKey}`);
    });
    writeLine();
  }

  // Invalidate Cloudfront
  if (uploadedAssets.length && options.cloudfront) {
    writeLine(chalk.bold("Beginning Cloudfront invalidation."));

    const cloudfrontClient = new CloudFrontClient({
      region: options.cloudfront.region,
    });

    try {
      const invalidation = await cloudfrontClient.send(
        new CreateInvalidationCommand({
          DistributionId: options.cloudfront.id,
          InvalidationBatch: {
            CallerReference: Date.now().toString(),
            Paths: {
              Items: uploadedAssets.map((asset) => `/${asset.bucketKey}`),
              Quantity: uploadedAssets.length,
            },
          },
        })
      );

      if (!invalidation.Invalidation) {
        console.error(invalidation);
        throw new Error("Created invalidation, but didn't define Invalidation");
      }

      writeLine(
        `${chalk.bold("Invalidation success.")} ${invalidation.Invalidation.Id}`
      );
    } catch (e) {
      console.error(e);
    }
  } else {
    writeLine(
      `${chalk.bold(
        "Skipping Cloudfront invalidation."
      )} No files were uploaded.`
    );
  }
}
