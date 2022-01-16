import path from "path";

import type { Config, Options } from "./types";

export function getOptions(config: Config, dryRun: boolean): Options {
  // Resolve `buildDir` into an absolute path using the current working
  // directory, if it isn't already an absolute path.
  let buildDirAbsolutePath: string;
  if (path.isAbsolute(config.buildDir)) {
    buildDirAbsolutePath = config.buildDir;
  } else {
    buildDirAbsolutePath = path.resolve(config.buildDir);
  }

  return {
    bucket: config.bucket,
    buildDirAbsolutePath,
    cloudfront: config.cloudfront || null,
    dryRun,
  };
}
