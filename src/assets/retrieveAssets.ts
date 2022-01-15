import { promises } from "fs";
import mime from "mime-types";
import path from "path";

import type { Options } from "../types";
import type { Asset } from "./types";

function getContentType(filename: string): string {
  const mimeType = mime.lookup(filename) || "application/octet-stream";
  const charset = mime.charset(mimeType);

  return charset ? mimeType + "; charset=" + charset.toLowerCase() : mimeType;
}

function getIsIgnored(options: Options, filename: string): boolean {
  if (filename.endsWith(".DS_Store")) {
    return true;
  }

  if (filename.endsWith(".js.LICENSE.txt")) {
    return true;
  }

  if (
    filename ===
    path.resolve(options.buildDirAbsolutePath, "asset-manifest.json")
  ) {
    return true;
  }

  return false;
}

async function recursiveRetrieveAssets(
  options: Options,
  directory: string,
  output: Asset[]
): Promise<void> {
  const entities = await promises.readdir(directory, { withFileTypes: true });
  await Promise.all(
    entities.map(async (entity): Promise<void> => {
      const absoluteFilename = path.resolve(directory, entity.name);
      if (entity.isDirectory()) {
        return recursiveRetrieveAssets(options, absoluteFilename, output);
      }

      output.push({
        // Don't include leading slash as well
        bucketKey: absoluteFilename.substring(
          options.buildDirAbsolutePath.length + 1
        ),
        contentType: getContentType(absoluteFilename),
        getContents: () => promises.readFile(absoluteFilename),
        isIgnored: getIsIgnored(options, absoluteFilename),
      });
    })
  );
}

export async function retrieveAssets(
  options: Options
): Promise<readonly Asset[]> {
  const assets: Asset[] = [];
  await recursiveRetrieveAssets(options, options.buildDirAbsolutePath, assets);
  return assets;
}
