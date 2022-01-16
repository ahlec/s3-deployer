import convict from "convict";
import { cosmiconfigSync } from "cosmiconfig";

import type {
  AssetDefinition,
  AssetDefinitions,
  BucketDefinition,
  CloudfrontDefinition,
  Config,
  Confirmation,
} from "../types";

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

function assertIsConfirmation(val: unknown): asserts val is Confirmation {
  switch (typeof val) {
    case "string":
    case "function": {
      return;
    }
    default: {
      throw new Error("Value is not a recognized Confirmation value");
    }
  }
}

const ASSET_DEFINITION_VALIDATOR = convict<AssetDefinition>({
  contentType: {
    default: undefined,
    format: String,
  },
});

const CONFIG_VALIDATOR = convict<Config>({
  assets: {
    default: {},
    format: (val: unknown): asserts val is AssetDefinitions | undefined => {
      if (typeof val === "undefined") {
        return;
      }

      if (typeof val !== "object" || !val) {
        throw new Error("Value, if specified, must be an object");
      }

      const fields = Object.entries(val);
      for (const [field, definition] of fields) {
        switch (typeof definition) {
          case "undefined":
          case "boolean": {
            continue;
          }
          case "object": {
            if (!definition) {
              throw new Error(`Asset definition '${field}' cannot be null`);
            }

            if (Array.isArray(definition)) {
              throw new Error(`Asset definition '${field}' cannot be an array`);
            }

            ASSET_DEFINITION_VALIDATOR.load(definition).validate();
            continue;
          }
          default: {
            throw new Error(
              `Asset definition '${field}' is invalid type: ${typeof definition}`
            );
          }
        }
      }
    },
  },
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
  confirmation: {
    default: undefined,
    format: (val: unknown) => {
      if (typeof val === "undefined") {
        return;
      }

      if (Array.isArray(val)) {
        val.forEach(assertIsConfirmation);
      } else {
        assertIsConfirmation(val);
      }
    },
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
