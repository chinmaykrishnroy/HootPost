const format = (level, args) => {
  const prefix = `[${new Date().toISOString()}] ${level}`;
  return [prefix, ...args];
};

export const logger = {
  info: (...args) => console.log(...format("INFO", args)),
  warn: (...args) => console.warn(...format("WARN", args)),
  error: (...args) => console.error(...format("ERROR", args)),
};

export default logger;
