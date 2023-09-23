# s3-deployer

Deploying to S3 and invalidating a Cloudfront distribution _is_ the deploying process for many web applications. Doing it can be trivial — until you need something non-trivial, at which point it quickly can become a nightmare.

The **s3-deployer** is a program that handles uploading to an S3 bucket and invalidating an optional Cloudfront distribution in front of it. This runs as a CLI script and is highly configurable.

## Features

What **s3-deployer** sets out to do is to handle uploading files the way you think about them in your codebase:

- **Configure how files are uploaded using glob patterns.** Your HTML files have different `Cache-Control` from your React assets; you only want _some_ of your source maps to be uploaded; it turns out you want a couple of your PNG files to have a custom `Content-Type`. Set up complex upload rules in a familiar, intuitive way!

- **Only deploy changed files.** When a file is uploaded to S3, it'll invalidate user caches which has a direct impact on load times. **s3-deployer** will only upload files which have changed. This is checked at deploy time — whether you last deployed on this computer or a different one, we'll only update files that need updating.

- **Helpful output (and input).** All of our output is logged to be easy to follow, informative on what's happening and why, and also pretty to look at. But the deploy process needs checks in place to ensure you're ready. Do you have scripts or processes you want to confirm have been run before deploy? Configure them to appear prior to the deploy process.

## Getting Started

Install using your preferred package manager:

```
yarn add --dev @ahlec/s3-deployer
npm install --save-dev @ahlec/s3-deployer
```

Then, configure your build using the options below.

When you're ready for a deploy, go ahead and run the script:

```
yarn s3-deployer
```

If you'd like to preview your build without actually running it, use the `--dry-run` CLI option. This makes no changes, but highlights what it would change.

## Configuration

**s3-deployer** uses [`cosmiconfig`](https://github.com/davidtheclark/cosmiconfig) to configure your build. This allows you to define your configuration in your **package.json** file, or in a dedicated file of a number of different types.

The key is `s3deployer` — add an `"s3deployer"` key to your **package.json** file, or try out **s3deployer.config.js** if you want an advanced configuration.

```javascript
const chalk = require("chalk");

module.exports = {
  assets: {
    "**/*.tmp": false,
    "**/static/*.png": {
      // These PNG files aren't managed by the build system
      cacheControl: "no-cache",
    },
  },
  bucket: {
    name: "my-amazing-s3-bucket",
    region: "us-west-1",
  },
  buildDir: "./build",
  confirmation: [`Have you run ${chalk.yellow("yarn pre-release")} yet?`],
  cloudfront: {
    id: "CL0UDFR0N7",
    region: "us-west-1",
  },
};
```

### `assets`

| Key      | Type                                   | Default   |
| -------- | -------------------------------------- | --------- |
| `assets` | `{ [glob: string]: Asset \| boolean }` | See below |

An optional parameter that is a lookup object of glob patterns to rules for how an asset should (or should not) be uploaded. The glob patterns are relative to the build directory.

A rule is one of three values:

- `true`: the asset should be uploaded with default options (default);
- `false`: the asset shouldn't be uploaded;
- An `Asset` type object

This field comes with defaults that should serve regular use cases:

```json
{
  "**/*.{htm,html}": {
    "cacheControl": "no-cache"
  },
  "**/.DS_Store": false
}
```

Any file in the build directory that doesn't have a provided rule will be uploaded with the default values of an `Asset` type object.

#### `Asset` type

| Field          | Type   | Default                                 |
| -------------- | ------ | --------------------------------------- |
| `acl`          | string | `"public-read"`                         |
| `cacheControl` | string | `"public, max-age=31536000, immutable"` |
| `contentType`  | string | (based on the MIME type of the file)    |

All fields are optional. If a value isn't provided, the default value will be used.

### `bucket` (Required)

| Key      | Type             | Default |
| -------- | ---------------- | ------- |
| `bucket` | BucketDefinition | (none)  |

The `bucket` config key describes your S3 bucket destination. This is a **required** field, and is an object with the following fields:

| Field    | Type   |
| -------- | ------ |
| `name`   | string |
| `region` | string |

### `buildDir` (Required)

| Key        | Type   | Default |
| ---------- | ------ | ------- |
| `buildDir` | string | (none)  |

The `buildDir` config key is the **required** string pathname to the directory you want to deploy. This is relative to the current working directory if it isn't an absolute path. The root of this directory will be uploaded to the root of the S3 bucket.

### `confirmation`

| Key            | Type                           | Default |
| -------------- | ------------------------------ | ------- |
| `confirmation` | Confirmation \| Confirmation[] | []      |

The `confirmation` config key is an **optional** array which, if specified, should contain yes/no prompts for the user to respond "yes" to in order to release. If the user responds "no" to any prompt, the deploy will not proceed.

The user will _always_ be prompted, prior to any custom confirmations, to confirm they desire to release alongside a timestamp of when the build directory was last modified.

A `Confirmation` maybe either a `string`, or a function that takes no parameters and returns a string.

### `cloudfront`

| Key          | Type                 | Default |
| ------------ | -------------------- | ------- |
| `cloudfront` | CloudfrontDefinition | `null`  |

The `cloudfront` config key is an **optional** configuration object which, if specified, will be invalidated after all files have been deployed to S3. If your S3 bucket is not behind a Cloudfront distribution, you may omit this or set this field to `null`. The `CloudfrontDistribution` type takes the following fields:

| Field    | Type   |
| -------- | ------ |
| `id`     | string |
| `region` | string |

### `title`

| Key     | Type   | Default       |
| ------- | ------ | ------------- |
| `title` | string | `"S3 Deploy"` |

The `title` config key is purely for display purposes. If specified, this configures the first line of text that is written out to the console when the application is started. This is purely for "branding" purposes or to provide more specific context for what this tool is about to do, and can be safely ignored.

### `subtitle`

| Key        | Type   | Default                                                               |
| ---------- | ------ | --------------------------------------------------------------------- |
| `subtitle` | string | `Deploying the latest build to the '${config.bucket.name}' S3 bucket` |

The `subtitle` config key is purely for display purposes. If specified, this configures the second line of text that is written out to the console when the application is started. This is purely for "branding" purposes, with a desired intention of providing more context for what this tool is going to perform. It can be safely omitted/ignored.
