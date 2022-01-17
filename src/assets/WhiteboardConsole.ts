import wrapAnsi from "wrap-ansi";

// https://www2.ccs.neu.edu/research/gpc/VonaUtils/vona/terminal/vtansi.htm
const VT100_ESC = "\u001B";
const VT100_ERASE_CURRENT_LINE = `${VT100_ESC}[2K`;
const VT100_MOVE_UP_AND_ERASE = `${VT100_ESC}[1A${VT100_ERASE_CURRENT_LINE}`;

function ansiEraseLines(numLines: number): string {
  if (numLines <= 0) {
    return "";
  }

  if (numLines === 1) {
    return VT100_ERASE_CURRENT_LINE;
  }

  return (
    VT100_ERASE_CURRENT_LINE + VT100_MOVE_UP_AND_ERASE.repeat(numLines - 1)
  );
}

type LoggerFn = (...args: readonly string[]) => void;

/**
 * Console output class that will continually rewrite itself, but only itself.
 * Allows for easily having sections that should update before moving on to the
 * next section.
 */
function WhiteboardConsole(): LoggerFn {
  let prevNumLines = 0;

  return (...args: readonly string[]): void => {
    const output = wrapAnsi(args.join(" ") + "\n", process.stdout.columns, {
      hard: true,
      trim: false,
      wordWrap: false,
    });

    process.stdout.write(
      prevNumLines ? ansiEraseLines(prevNumLines) + output : output
    );
    prevNumLines = output.split("\n").length;
  };
}

export default WhiteboardConsole;
