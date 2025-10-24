export const logger = {
  info: (message: string) => {
    process.stderr.write(`[info] ${message}\n`);
  },
  warn: (message: string) => {
    process.stderr.write(`[warn] ${message}\n`);
  },
  error: (error: string | Error) => {
    if (error instanceof Error) {
      process.stderr.write(`[error] ${error.stack ?? error.message}\n`);
    } else {
      process.stderr.write(`[error] ${error}\n`);
    }
  },
};
