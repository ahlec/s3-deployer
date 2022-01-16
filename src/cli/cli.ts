import chalk from "chalk";

import { writeLine } from "../console";
import { runDeploy } from "../main";
import { getOptions } from "../options";

import { loadConfig } from "./config";
import { COSMICONFIG_MODULE_NAME } from "./constants";

async function main(): Promise<void> {
  // Retrieve the config
  const config = loadConfig();
  if (!config) {
    writeLine(
      `${chalk.red(
        "Config file could not be found."
      )} Define a cosmiconfig config for '${COSMICONFIG_MODULE_NAME}'.`
    );
    process.exit(10);
  }

  const options = getOptions(config);
  runDeploy(options);
}

main();
