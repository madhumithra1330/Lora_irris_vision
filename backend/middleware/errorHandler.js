/**
 * Global Express Error Handler Middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('[Global Error Handler]', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: message
  });
}
