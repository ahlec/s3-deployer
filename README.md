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
    id: "CL0UDFR0NT!",
    region: "us-west-1",
  },
};
```
