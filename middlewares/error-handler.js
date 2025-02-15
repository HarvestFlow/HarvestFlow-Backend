// error-handler.js

export function notFoundError(req, res, next) {
  console.log("notFoundError middleware called");
  const err = new Error("not found");
  err.status = 404;
  next(err);
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  res.status(status).json({
    message: err.message,
    error: (status === 404) ? 'Not Found' : err.stack,
  });

  console.error(err);
}
