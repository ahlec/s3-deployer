import convict from "convict";
import { cosmiconfigSync } from "cosmiconfig";

import type { BucketDefinition, CloudfrontDefinition, Config } from "../types";

import { COSMICONFIG_MODULE_NAME } from "./constants";

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
    format: CONVICT_FORMAT_NONEMPTY_STRING,
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

export function loadConfig(): Config | null {
  const loader = cosmiconfigSync(COSMICONFIG_MODULE_NAME);
  const configFile = loader.search();
  if (!configFile || !configFile.config) {
    return null;
  }

  const validated = CONFIG_VALIDATOR.load<Config>(configFile.config).validate();
  return validated.getProperties();
}
