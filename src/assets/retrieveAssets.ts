import { promises } from "fs";
import path from "path";

import type { Options } from "../types";
import { prepareAsset } from "./prepareAsset";
import type { Asset } from "./types";

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

      output.push(prepareAsset(options, absoluteFilename));
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
