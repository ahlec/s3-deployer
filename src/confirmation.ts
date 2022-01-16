import inquirer from "inquirer";

async function confirm(prompt: string): Promise<boolean> {
  const { result } = await inquirer.prompt({
    message: prompt,
    name: "result",
    type: "confirm",
  });
  return result;
}

export async function receiveDeployConfirmation(
  prompts: readonly string[]
): Promise<boolean> {
  for (const prompt of prompts) {
    const response = await confirm(prompt);
    if (!response) {
      return false;
    }
  }

  return true;
}
