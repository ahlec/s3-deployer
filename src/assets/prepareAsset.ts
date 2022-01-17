import { promises } from "fs";
import micromatch from "micromatch";
import mime from "mime-types";

import type { Options } from "../types";
import type { Asset, IgnoreReason } from "./types";

function getDefaultContentType(filename: string): string {
  const mimeType = mime.lookup(filename) || "application/octet-stream";
  const charset = mime.charset(mimeType);

  return charset ? mimeType + "; charset=" + charset.toLowerCase() : mimeType;
}

export function prepareAsset(
  options: Options,
  absoluteFilename: string
): Asset {
  // Get the filename relative to the build directory (INCLUDE the leading /)
  const relativeFilename = absoluteFilename.substring(
    options.buildDirAbsolutePath.length
  );

  const rule = options.assetSpecialRules.find((r) =>
    micromatch.isMatch(relativeFilename, r.globPattern)
  );

  let isIgnored: IgnoreReason | false;
  let contentType: string;
  if (rule) {
    if (rule.definition === false) {
      isIgnored = {
        globPattern: rule.globPattern,
        isDefaultRule: rule.isDefaultRule,
      };
    } else {
      isIgnored = false;
    }

    if (typeof rule.definition === "object" && rule.definition.contentType) {
      contentType = rule.definition.contentType;
    } else {
      contentType = getDefaultContentType(absoluteFilename);
    }
  } else {
    isIgnored = false;
    contentType = getDefaultContentType(absoluteFilename);
  }

  return {
    // Bucket key should NOT include the leading / since it will nest everything
    // in a '/' directory in the S3 bucket
    bucketKey: relativeFilename.substring(1),
    contentType,
    getContents: () => promises.readFile(absoluteFilename),
    isIgnored,
  };
}
