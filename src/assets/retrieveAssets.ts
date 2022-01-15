import { promises } from "fs";
import mime from "mime-types";
import path from "path";

import type { Config } from "../types";
import type { Asset } from "./types";

function getContentType(filename: string): string {
  const mimeType = mime.lookup(filename) || "application/octet-stream";
  const charset = mime.charset(mimeType);

  return charset ? mimeType + "; charset=" + charset.toLowerCase() : mimeType;
}

function getIsIgnored(config: Config, filename: string): boolean {
  if (filename.endsWith(".DS_Store")) {
    return true;
  }

  if (filename.endsWith(".js.LICENSE.txt")) {
    return true;
  }

  if (filename === path.resolve(config.buildDir, "asset-manifest.json")) {
    return true;
  }

  return false;
}

async function recursiveRetrieveAssets(
  config: Config,
  directory: string,
  output: Asset[]
): Promise<void> {
  const entities = await promises.readdir(directory, { withFileTypes: true });
  await Promise.all(
    entities.map(async (entity): Promise<void> => {
      const absoluteFilename = path.resolve(directory, entity.name);
      if (entity.isDirectory()) {
        return recursiveRetrieveAssets(config, absoluteFilename, output);
      }

      output.push({
        // Don't include leading slash as well
        bucketKey: absoluteFilename.substring(config.buildDir.length + 1),
        contentType: getContentType(absoluteFilename),
        getContents: () => promises.readFile(absoluteFilename),
        isIgnored: getIsIgnored(config, absoluteFilename),
      });
    })
  );
}

export async function retrieveAssets(
  config: Config
): Promise<readonly Asset[]> {
  const assets: Asset[] = [];
  await recursiveRetrieveAssets(config, config.buildDir, assets);
  return assets;
}
