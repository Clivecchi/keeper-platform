# API Logging Configuration

## Environment Variables

### `LOG_LEVEL`
Controls the verbosity of logging:
- `info` (default) - Standard logging
- `debug` - Detailed logging including stack traces
- `verbose` - Maximum verbosity
- `error` - Only error logging

### `ENABLE_REQUEST_LOGGING`
Controls request/response logging:
- `true` - Enable request logging in all environments
- `false` (default) - Only log requests in development

## Examples

```bash
# Development with full logging
LOG_LEVEL=debug ENABLE_REQUEST_LOGGING=true pnpm dev

# Production with minimal logging
LOG_LEVEL=error pnpm start

# Production with request logging enabled
LOG_LEVEL=info ENABLE_REQUEST_LOGGING=true pnpm start
```

## What Gets Logged

### Development Mode (Default)
- ✅ All HTTP requests and responses
- ✅ CORS checks
- ✅ Error details with stack traces
- ✅ Startup information

### Production Mode
- ❌ No request/response logging (unless enabled)
- ✅ Error logging (minimal)
- ✅ Startup information
- ✅ Health check endpoints

### Debug Mode
- ✅ Everything from development
- ✅ Detailed error information
- ✅ Full request/response details

## Recent Optimizations

1. **Removed duplicate CORS handling** - Eliminated redundant OPTIONS processing
2. **Added request caching** - CORS preflight results cached for 24 hours
3. **Environment-based logging** - Reduced noise in production
4. **Skip OPTIONS logging** - Eliminated preflight request noise
5. **Configurable verbosity** - Control logging level via environment variables 