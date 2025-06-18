export const logRequestMiddleware = (req, res, next) => {
    const start = Date.now();
    const { method, path } = req;
    console.log(`[REQ] --> ${method} ${path}`);
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        console.log(`[RES] <-- ${method} ${path} ${statusCode} ${duration}ms`);
    });
    next();
};
