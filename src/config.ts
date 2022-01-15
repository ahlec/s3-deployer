import convict from "convict";
import { cosmiconfigSync } from "cosmiconfig";
import path from "path";

import { COSMICONFIG_MODULE_NAME } from "./constants";
import type { BucketDefinition, CloudfrontDefinition, Config } from "./types";

const CONVICT_FORMAT_NONEMPTY_STRING = "nonempty-string";

convict.addFormat({
  coerce: function (val: unknown): string {
    return String(val);
  },
  name: CONVICT_FORMAT_NONEMPTY_STRING,
  validate: function (val: unknown): asserts val is string {
    if (typeof val !== "string") {
      throw new Error("Must be a string");
    }

    if (!val.length) {
      throw new Error("String must not be empty");
    }
  },
});

function buildConvictFormat<T>(
  schema: convict.Schema<T>
): (val: unknown) => asserts val is T {
  const validator = convict<T>(schema);

  return (val) => {
    if (typeof val !== "object" || !val) {
      throw new Error("Value must be an object.");
    }

    validator.load(val).validate();
  };
}

const CONFIG_VALIDATOR = convict<Config>({
  bucket: {
    default: null,
    format: buildConvictFormat<BucketDefinition>({
      name: {
        default: null,
        format: CONVICT_FORMAT_NONEMPTY_STRING,
      },
      region: {
        default: null,
        format: CONVICT_FORMAT_NONEMPTY_STRING,
      },
    }),
  },
  buildDir: {
    default: null,
    format: (val: unknown): asserts val is string => {
      if (typeof val !== "string") {
        throw new Error("Value must be a string.");
      }

      if (!val.length) {
        throw new Error("Value must not be empty.");
      }
    },
  },
  cloudfront: {
    default: undefined,
    format: buildConvictFormat<CloudfrontDefinition>({
      id: {
        default: null,
        format: CONVICT_FORMAT_NONEMPTY_STRING,
      },
      region: {
        default: null,
        format: CONVICT_FORMAT_NONEMPTY_STRING,
      },
    }),
  },
});

/**
 * Retrieves the user's config from wherever it is located in their repository.
 */
function retrieveConfig(): Config | null {
  const loader = cosmiconfigSync(COSMICONFIG_MODULE_NAME);
  const configFile = loader.search();
  if (!configFile || !configFile.config) {
    return null;
  }

  const validated = CONFIG_VALIDATOR.load<Config>(configFile.config).validate();
  return validated.getProperties();
}

/**
 * Takes a raw {@type Config} (what the user specifies) and resolves various
 * properties -- ie, resolving local directories to absolute, merging in default
 * values, etc.
 */
function resolveConfig(rawConfig: Config): Config {
  // `buildDir` should always be an absolute path. If we're given an relative path,
  // resolve it relative to the current working directory
  let buildDir: string;
  if (path.isAbsolute(rawConfig.buildDir)) {
    buildDir = rawConfig.buildDir;
  } else {
    buildDir = path.resolve(rawConfig.buildDir);
  }

  return {
    bucket: rawConfig.bucket,
    buildDir,
    cloudfront: rawConfig.cloudfront,
  };
}

export function getConfig(): Config | null {
  const rawConfig = retrieveConfig();
  if (!rawConfig) {
    return null;
  }

  return resolveConfig(rawConfig);
}
