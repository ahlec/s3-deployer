import chalk from "chalk";
import { promises } from "fs";
import mime from "mime-types";
import path from "path";

import { eraseLastLine, writeLine } from "./console";
import { LOCAL_BUILD_DIRECTORY } from "./constants";

export interface Asset {
  bucketKey: string;
  contentType: string;
  getContents: () => Promise<Buffer>;
  isIgnored: boolean;
}

function getContentType(filename: string): string {
  const mimeType = mime.lookup(filename) || "application/octet-stream";
  const charset = mime.charset(mimeType);

  return charset ? mimeType + "; charset=" + charset.toLowerCase() : mimeType;
}

function getIsIgnored(filename: string): boolean {
  if (filename.endsWith(".DS_Store")) {
    return true;
  }

  if (filename.endsWith(".js.LICENSE.txt")) {
    return true;
  }

  if (filename === path.resolve(LOCAL_BUILD_DIRECTORY, "asset-manifest.json")) {
    return true;
  }

  return false;
}

async function recursiveRetrieveAssets(
  directory: string,
  output: Asset[]
): Promise<void> {
  const entities = await promises.readdir(directory, { withFileTypes: true });
  await Promise.all(
    entities.map(async (entity): Promise<void> => {
      const absoluteFilename = path.resolve(directory, entity.name);
      if (entity.isDirectory()) {
        return recursiveRetrieveAssets(absoluteFilename, output);
      }

      output.push({
        // Don't include leading slash as well
        bucketKey: absoluteFilename.substr(LOCAL_BUILD_DIRECTORY.length + 1),
        contentType: getContentType(absoluteFilename),
        getContents: () => promises.readFile(absoluteFilename),
        isIgnored: getIsIgnored(absoluteFilename),
      });
    })
  );
}

export async function retrieveAssets(): Promise<readonly Asset[]> {
  const assets: Asset[] = [];
  await recursiveRetrieveAssets(LOCAL_BUILD_DIRECTORY, assets);
  return assets;
}

export type AssetState =
  | "skipped"
  | "uploading"
  | "uploaded"
  | "error"
  | "ignored";

let prevAssetWritten: Asset | null = null;
export function writeAsset(asset: Asset, state: AssetState): void {
  if (prevAssetWritten === asset) {
    eraseLastLine();
  } else {
    prevAssetWritten = asset;
  }

  let line: string;
  switch (state) {
    case "error": {
      line = `${chalk.bold.bgHex("#cd5a68")("    ERROR ")} ${asset.bucketKey}`;
      break;
    }
    case "skipped": {
      line = `${chalk.bold.bgHex("#394253")("  SKIPPED ")} ${chalk.dim(
        asset.bucketKey
      )}`;
      break;
    }
    case "uploaded": {
      line = `${chalk.bold.bgHex("#9cbf87").hex("#000")(" UPLOADED ")} ${
        asset.bucketKey
      }`;
      break;
    }
    case "uploading": {
      line = `${chalk.bold.bgHex("#f1ca81").hex("#000")("WORKING.. ")} ${
        asset.bucketKey
      }`;
      break;
    }
    case "ignored": {
      line = `${chalk.bold("  IGNORED ")} ${chalk.dim(asset.bucketKey)}`;
      break;
    }
  }

  writeLine(line);
}
