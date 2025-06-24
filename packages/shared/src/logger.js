const createLogger = (prefix = 'Keeper') => {
    const log = (level, ...args) => {
        const timestamp = new Date().toISOString();
        // eslint-disable-next-line no-console
        console[level === 'debug' ? 'log' : level](`[${timestamp}] [${prefix}] [${level.toUpperCase()}]`, ...args);
    };
    return {
        debug: (...args) => log('debug', ...args),
        info: (...args) => log('info', ...args),
        warn: (...args) => log('warn', ...args),
        error: (...args) => log('error', ...args),
    };
};
export const logger = createLogger();
//# sourceMappingURL=logger.js.map