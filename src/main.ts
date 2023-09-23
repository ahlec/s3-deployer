import chalk from "chalk";
import { existsSync, promises } from "fs";
import { S3Client } from "@aws-sdk/client-s3";

import type { Asset } from "./assets/types";
import { retrieveAssets } from "./assets/retrieveAssets";
import { uploadAsset } from "./assets/uploadAsset";

import { invalidateCloudfront } from "./cloudfront";
import { receiveDeployConfirmation } from "./confirmation";
import type { Options } from "./types";

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
  console.log(chalk.bold("Personal Website Release Tool"));
  console.log("Deploys Alec's personal website to S3");
  console.log();

  // Output information about the last build
  const doesBuildDirectoryExist = existsSync(options.buildDirAbsolutePath);

  console.log(
    `${chalk.bold("Build directory:")} ${options.buildDirAbsolutePath}`,
  );
  if (!doesBuildDirectoryExist) {
    console.log(
      `${chalk.red("Directory does not exist.")} Run ${chalk.bold(
        "yarn build",
      )} to generate a build.`,
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

  console.log(
    lastModifiedChalk(
      `${chalk.bold("Last modified:")} ${buildDirLastModified.toString()} (${
        relativeLastModified.label
      })`,
    ),
  );

  console.log();

  // Perform the pre-deploy confirmation checks
  const readyToDeploy = await receiveDeployConfirmation(
    options.confirmationPrompts,
  );
  if (!readyToDeploy) {
    return;
  }

  const assets = await retrieveAssets(options);

  // Perform the initial upload to S3
  console.log(chalk.bold("Beginning S3 Upload."));
  const s3Client = new S3Client({ region: options.bucket.region });
  const uploadedAssets: Asset[] = [];
  for (const asset of assets) {
    const result = await uploadAsset(s3Client, options, asset);

    if (result.shouldInvalidateCloudfront) {
      uploadedAssets.push(asset);
    }
  }

  // Add a summary for the uploads
  console.log();
  console.log(
    `${chalk.bold("S3 Upload Complete.")} ${uploadedAssets.length} ${
      uploadedAssets.length === 1 ? "asset" : "assets"
    } uploaded.`,
  );
  if (uploadedAssets.length) {
    uploadedAssets.forEach((asset): void => {
      console.log(` • ${asset.bucketKey}`);
    });
  }

  // Invalidate Cloudfront
  if (options.cloudfront) {
    console.log();
    await invalidateCloudfront(options.cloudfront, uploadedAssets, options);
  }
}
