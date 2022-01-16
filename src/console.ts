import os from "os";

export function writeLine(str?: string): void {
  if (str) {
    process.stdout.write(str);
  }

  process.stdout.write(os.EOL);
}

export function eraseLastLine(): void {
  process.stdout.moveCursor(0, -1);
  process.stdout.clearLine(0);
}
