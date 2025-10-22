export const logger = {
  info: (message: string) => {
    process.stderr.write(`[info] ${message}\n`);
  },
  warn: (message: string) => {
    process.stderr.write(`[warn] ${message}\n`);
  },
  error: (message: string) => {
    process.stderr.write(`[error] ${message}\n`);
  },
};
