import chalk from "chalk";

import { eraseLastLine, writeLine } from "../console";

import type { Asset, AssetState } from "./types";

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
