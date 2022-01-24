import chalk from "chalk";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";

import type { Asset } from "./assets/types";
import type { CloudfrontDefinition, Options } from "./types";

export async function invalidateCloudfront(
  cloudfront: CloudfrontDefinition,
  assets: readonly Asset[],
  options: Options
): Promise<void> {
  if (!assets.length) {
    console.log(
      `${chalk.bold(
        "Skipping Cloudfront invalidation."
      )} No files were uploaded.`
    );
    return;
  }

  console.log(chalk.bold("Beginning Cloudfront invalidation."));
  if (options.dryRun) {
    console.log(
      chalk.yellow("Dry run, so no invalidation is being performed.")
    );
    return;
  }

  const cloudfrontClient = new CloudFrontClient({
    region: cloudfront.region,
  });

  try {
    const invalidation = await cloudfrontClient.send(
      new CreateInvalidationCommand({
        DistributionId: cloudfront.id,
        InvalidationBatch: {
          CallerReference: Date.now().toString(),
          Paths: {
            Items: assets.map((asset) => `/${asset.bucketKey}`),
            Quantity: assets.length,
          },
        },
      })
    );

    if (!invalidation.Invalidation) {
      console.error(invalidation);
      throw new Error("Created invalidation, but didn't define Invalidation");
    }

    console.log(
      `${chalk.bold("Invalidation success.")} ${invalidation.Invalidation.Id}`
    );
  } catch (e) {
    console.error(e);
  }
}
