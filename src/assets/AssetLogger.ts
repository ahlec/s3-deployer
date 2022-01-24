import chalk from "chalk";
import wrapAnsi from "wrap-ansi";

// https://www2.ccs.neu.edu/research/gpc/VonaUtils/vona/terminal/vtansi.htm
const VT100_ESC = "\u001B";
const VT100_ERASE_CURRENT_LINE = `${VT100_ESC}[2K`;
const VT100_MOVE_UP_AND_ERASE = `${VT100_ESC}[1A${VT100_ERASE_CURRENT_LINE}`;

const STATUS_BADGE_WIDTH_CHARS = 11;
const DETAILS_RESERVED_SPACE = STATUS_BADGE_WIDTH_CHARS - 3;

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

function makeBadge({ chalk, text }: StatusBadge): string {
  let paddedText: string;
  if (text.length > STATUS_BADGE_WIDTH_CHARS) {
    paddedText = text.substring(0, STATUS_BADGE_WIDTH_CHARS);
  } else {
    const remainingSpace = Math.max(0, STATUS_BADGE_WIDTH_CHARS - text.length);
    const leftSide = Math.floor(remainingSpace / 2);
    const rightSide = remainingSpace - leftSide;
    paddedText = `${" ".repeat(leftSide)}${text}${" ".repeat(rightSide)}`;
  }

  return chalk(paddedText);
}

export type StatusBadge = {
  text: string;
  chalk: chalk.Chalk;
};

type LoggerOptions = {
  assetName: string;
  details: readonly string[];
  statusBadge: StatusBadge;
};

type LoggerFn = (options: LoggerOptions) => void;

export function makeAssetLogger(): LoggerFn {
  let prevNumLines = 0;

  const wrap = (
    text: string,
    reservedSpaces: number,
    getPrefix: (index: number) => string
  ): string =>
    wrapAnsi(
      text,
      // Also include reserved space for separator between prefix + line
      process.stdout.columns - reservedSpaces - 1,
      {
        hard: true,
        trim: false,
        wordWrap: false,
      }
    )
      .split("\n")
      .map((line, index) => `${chalk.white(getPrefix(index))} ${line}`)
      .join("\n");

  return ({ assetName, details, statusBadge }: LoggerOptions): void => {
    // Wrap the main line into terminal space not taken up by status badge (+ space)
    const wrappedMain = wrap(
      chalk.dim(assetName),
      STATUS_BADGE_WIDTH_CHARS,
      (index) =>
        index === 0
          ? makeBadge(statusBadge)
          : " ".repeat(STATUS_BADGE_WIDTH_CHARS)
    );

    // Wrap the details into the available details space
    const wrappedDetails = details
      .map((detail, detailIndex) =>
        wrap(detail, DETAILS_RESERVED_SPACE, (lineIndex) => {
          let symbol: string;
          if (detailIndex === details.length - 1) {
            symbol = lineIndex === 0 ? "└" : " ";
          } else {
            symbol = lineIndex === 0 ? "├" : "│";
          }

          return `${" ".repeat(DETAILS_RESERVED_SPACE - 1)}${symbol}`;
        })
      )
      .join("\n");

    // Combine everything
    const output =
      wrappedMain + "\n" + (wrappedDetails ? wrappedDetails + "\n" : "");

    // Erase what's already there, and write out to the console
    process.stdout.write(
      prevNumLines ? ansiEraseLines(prevNumLines) + output : output
    );
    prevNumLines = output.split("\n").length;
  };
}
