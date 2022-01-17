export type AssetDefinition = {
  contentType?: string;
};

export type AssetDefinitions = {
  [globPattern: string]: AssetDefinition | boolean | undefined;
};

export type Confirmation = string | (() => string);

export type BucketDefinition = {
  name: string;
  region: string;
};

export type CloudfrontDefinition = {
  id: string;
  region: string;
};

export type Config = {
  /**
   * Custom rules for which assets should be deployed to the S3 bucket. This
   * is optional and comes with sensible defaults for which files should be
   * deployed and how; specifying this value allows for customizing this
   * behavior.
   *
   * Assets are identified using glob patterns resolved relative to the root
   * of the build directory.
   *
   * TO DEPLOY AN ASSET:
   *      - Specify a complex object (@see AssetDefinition)
   *      - Specify true
   *      - Omit/define nothing (will fall back to using defaults)
   *
   * TO IGNORE AN ASSET:
   *      - Specify false
   */
  assets?: AssetDefinitions;

  /**
   * The AWS S3 bucket that files should be deployed to.
   */
  bucket: BucketDefinition;

  /**
   * The directory of the code that should be deployed to the S3 bucket.
   * If this is a relative filename, it will be resolved according to the
   * working directory.
   */
  buildDir: string;

  /**
   * Additional confirmation (y/n prompts) that the user must confirm prior to
   * deploying. If the user answers "no" to any of these prompts, the deploy
   * process will be aborted.
   *
   * @example ["Have you run `yarn lint` yet?", "Have you updated the package.json version?"]
   */
  confirmation?: Confirmation | readonly Confirmation[];

  /**
   * The AWS Cloudfront distribution that serves the provided S3 bucket and
   * which should be invalidated as part of the deploy.
   *
   * If there is no Cloudfront distribution, omit this property or explicitly
   * pass @null.
   */
  cloudfront?: CloudfrontDefinition | null;
};

export type AssetRule = {
  globPattern: string;
  isDefaultRule: boolean;
  definition: AssetDefinition | boolean;
};

export type Options = {
  assetSpecialRules: readonly AssetRule[];
  bucket: BucketDefinition;

  /**
   * Absolute path to the build directory. Should NOT contain a trailing
   * slash at the end.
   */
  buildDirAbsolutePath: string;
  cloudfront: CloudfrontDefinition | null;
  confirmationPrompts: readonly string[];
  dryRun: boolean;
};
