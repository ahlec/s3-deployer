import { promises } from "fs";
import micromatch from "micromatch";
import mime from "mime-types";

import { DEFAULT_ACL, DEFAULT_CACHE_CONTROL } from "../constants";
import type { Options } from "../types";
import type { Asset, IgnoreReason } from "./types";

function getDefaultContentType(filename: string): string {
  const mimeType = mime.lookup(filename) || "application/octet-stream";
  const charset = mime.charset(mimeType);

  return charset ? mimeType + "; charset=" + charset.toLowerCase() : mimeType;
}

export function prepareAsset(
  options: Options,
  absoluteFilename: string,
): Asset {
  // Get the filename relative to the build directory (INCLUDE the leading /)
  const relativeFilename = absoluteFilename.substring(
    options.buildDirAbsolutePath.length,
  );

  const rule = options.assetSpecialRules.find((r) =>
    micromatch.isMatch(relativeFilename, r.globPattern),
  );

  let isIgnored: IgnoreReason | false;
  let contentType: string;
  let cacheControl: string;
  let acl: string;
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

    if (typeof rule.definition === "object" && rule.definition.cacheControl) {
      cacheControl = rule.definition.cacheControl;
    } else {
      cacheControl = DEFAULT_CACHE_CONTROL;
    }

    if (typeof rule.definition === "object" && rule.definition.acl) {
      acl = rule.definition.acl;
    } else {
      acl = DEFAULT_ACL;
    }
  } else {
    isIgnored = false;
    contentType = getDefaultContentType(absoluteFilename);
    cacheControl = DEFAULT_CACHE_CONTROL;
    acl = DEFAULT_ACL;
  }

  return {
    acl,
    // Bucket key should NOT include the leading / since it will nest everything
    // in a '/' directory in the S3 bucket
    bucketKey: relativeFilename.substring(1),
    cacheControl,
    contentType,
    getContents: () => promises.readFile(absoluteFilename),
    isIgnored,
  };
}
