import Ajv, { JSONSchemaType } from "ajv";
import { cosmiconfigSync } from "cosmiconfig";

import type {
  AssetDefinition,
  BucketDefinition,
  CloudfrontDefinition,
  Config,
} from "../types";

import { COSMICONFIG_MODULE_NAME } from "./constants";

const ASSET_DEFINITION_SCHEMA: JSONSchemaType<AssetDefinition> = {
  additionalProperties: false,
  properties: {
    contentType: {
      nullable: true,
      type: "string",
    },
  },
  type: "object",
};

const BUCKET_DEFINITION_SCHEMA: JSONSchemaType<BucketDefinition> = {
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
    },
    region: {
      type: "string",
    },
  },
  required: ["name", "region"],
  type: "object",
};

const CLOUDFRONT_DEFINITION_SCHEMA: JSONSchemaType<CloudfrontDefinition> = {
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
    },
    region: {
      type: "string",
    },
  },
  required: ["id", "region"],
  type: "object",
};

const SCHEMA: JSONSchemaType<Config> = {
  additionalProperties: false,
  properties: {
    assets: {
      additionalProperties: {
        anyOf: [
          {
            type: "boolean",
          },
          ASSET_DEFINITION_SCHEMA,
        ],
      },
      nullable: true,
      type: "object",
    },
    bucket: BUCKET_DEFINITION_SCHEMA,
    buildDir: {
      type: "string",
    },
    cloudfront: { ...CLOUDFRONT_DEFINITION_SCHEMA, nullable: true },
    confirmation: {
      items: {
        type: "string",
      },
      nullable: true,
      type: "array",
    },
  },
  required: ["bucket", "buildDir"],
  type: "object",
};

export function loadConfig(): Config | null {
  const loader = cosmiconfigSync(COSMICONFIG_MODULE_NAME);
  const configFile = loader.search();
  if (!configFile || !configFile.config) {
    return null;
  }

  const config: unknown = configFile.config;

  const ajv = new Ajv();
  const validate = ajv.compile(SCHEMA);
  const valid = validate(config);
  if (!valid) {
    console.error(validate.errors);
    return null;
  }

  return config;
}
