import path from "path";

import type { Config, Confirmation, Options } from "./types";

export function getOptions(config: Config, dryRun: boolean): Options {
  // Resolve `buildDir` into an absolute path using the current working
  // directory, if it isn't already an absolute path.
  let buildDirAbsolutePath: string;
  if (path.isAbsolute(config.buildDir)) {
    buildDirAbsolutePath = config.buildDir;
  } else {
    buildDirAbsolutePath = path.resolve(config.buildDir);
  }

  // Resolve all of our confirmations into the same data type
  const confirmationPrompts: string[] = [
    // Should always have a base prompt for confirming that the user intends to
    // perform a deploy -- would be too dangerous to risk running a deploy just
    // because you started running a script.
    "Would you like to deploy the latest build in the build directory?",
  ];
  if (config.confirmation) {
    const appendConfirmation = (conf: Confirmation): void => {
      if (typeof conf === "string") {
        confirmationPrompts.push(conf);
      } else {
        confirmationPrompts.push(conf());
      }
    };

    if (typeof config.confirmation === "object") {
      config.confirmation.forEach(appendConfirmation);
    } else {
      appendConfirmation(config.confirmation);
    }
  }

  return {
    bucket: config.bucket,
    buildDirAbsolutePath,
    cloudfront: config.cloudfront || null,
    confirmationPrompts,
    dryRun,
  };
}
