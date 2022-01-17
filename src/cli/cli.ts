import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { runDeploy } from "../main";
import { getOptions } from "../options";

import { loadConfig } from "./config";
import { COSMICONFIG_MODULE_NAME } from "./constants";

async function main(): Promise<void> {
  // Retrieve the config
  const config = loadConfig();
  if (!config) {
    console.log(
      `${chalk.red(
        "Config file could not be found."
      )} Define a cosmiconfig config for '${COSMICONFIG_MODULE_NAME}'.`
    );
    process.exit(10);
  }

  // Handle CLI arguments
  const cliArgs = await yargs(hideBin(process.argv))
    .option("dryRun", {
      default: false,
      type: "boolean",
    })
    .parse();

  const options = getOptions(config, cliArgs.dryRun);

  runDeploy(options);
}

main();
