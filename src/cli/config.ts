import Ajv, { JSONSchemaType } from "ajv";
import { cosmiconfig } from "cosmiconfig";

import { COSMICONFIG_MODULE_NAME } from "../constants";
import type {
  AssetDefinition,
  BucketDefinition,
  CloudfrontDefinition,
  Config,
} from "../types";

const ASSET_DEFINITION_SCHEMA: JSONSchemaType<AssetDefinition> = {
  additionalProperties: false,
  properties: {
    acl: {
      nullable: true,
      type: "string",
    },
    cacheControl: {
      nullable: true,
      type: "string",
    },
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

export async function loadConfig(): Promise<Config | null> {
  const loader = cosmiconfig(COSMICONFIG_MODULE_NAME);
  const configFile = await loader.search();
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
