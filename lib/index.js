"use strict";

exports = module.exports = function historyApiFallback(options) {
  options = options || {};
  const logger = getLogger(options);

  return async function (ctx, next) {
    const { request } = ctx;
    const parsedUrl = request.URL;
    const headers = request.headers;
    if (request.method !== "GET") {
      logger(
        "Not rewriting",
        request.method,
        request.url,
        "because the method is not GET."
      );
      return await next();
    } else if (!headers || typeof headers.accept !== "string") {
      logger(
        "Not rewriting",
        request.method,
        request.url,
        "because the client did not send an HTTP accept header."
      );
      return await next();
    } else if (headers.accept.indexOf("application/json") === 0) {
      logger(
        "Not rewriting",
        request.method,
        request.url,
        "because the client prefers JSON."
      );
      return await next();
    } else if (!acceptsHtml(headers.accept, options)) {
      logger(
        "Not rewriting",
        request.method,
        request.url,
        "because the client does not accept HTML."
      );
      return await next();
    }
    let rewriteTarget;
    options.rewrites = options.rewrites || [];
    for (let i = 0; i < options.rewrites.length; i++) {
      const rewrite = options.rewrites[i];
      const match = parsedUrl.pathname.match(rewrite.from);
      if (match !== null) {
        rewriteTarget = evaluateRewriteRule(
          parsedUrl,
          match,
          rewrite.to,
          request
        );

        if (rewriteTarget.charAt(0) !== "/") {
          logger(
            "We recommend using an absolute path for the rewrite target.",
            "Received a non-absolute rewrite target",
            rewriteTarget,
            "for URL",
            request.url
          );
        }

        logger("Rewriting", request.method, request.url, "to", rewriteTarget);
        request.url = rewriteTarget;
        return await next();
      }
    }

    const pathname = parsedUrl.pathname;
    if (
      pathname.lastIndexOf(".") > pathname.lastIndexOf("/") &&
      options.disableDotRule !== true
    ) {
      logger(
        "Not rewriting",
        request.method,
        request.url,
        "because the path includes a dot (.) character."
      );
      return await next();
    }

    rewriteTarget = options.index || "/index.html";
    logger("Rewriting", request.method, request.url, "to", rewriteTarget);
    request.url = rewriteTarget;
    await next();
  };
};

function evaluateRewriteRule(parsedUrl, match, rule, request) {
  if (typeof rule === "string") {
    return rule;
  } else if (typeof rule !== "function") {
    throw new Error("Rewrite rule can only be of type string or function.");
  }

  return rule({
    parsedUrl: parsedUrl,
    match: match,
    request: request,
  });
}

function acceptsHtml(header, options) {
  options.htmlAcceptHeaders = options.htmlAcceptHeaders || ["text/html", "*/*"];
  for (let i = 0; i < options.htmlAcceptHeaders.length; i++) {
    if (header.indexOf(options.htmlAcceptHeaders[i]) !== -1) {
      return true;
    }
  }
  return false;
}

function getLogger(options) {
  if (options && options.logger) {
    return options.logger;
  } else if (options && options.verbose) {
    // eslint-disable-next-line no-console
    return console.log.bind(console);
  }
  return function () {};
}
