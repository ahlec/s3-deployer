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

export type Options = {
  bucket: BucketDefinition;
  buildDirAbsolutePath: string;
  cloudfront: CloudfrontDefinition | null;
  confirmationPrompts: readonly string[];
  dryRun: boolean;
};
