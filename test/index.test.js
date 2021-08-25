/* eslint-env jest */

"use strict";

const sinon = require("sinon");
const { URL } = require("url");
const historyApiFallback = require("../lib");

const BASE = "http://localhost:9001";

describe("koa2-history-api-fallback-async", () => {
  let middleware;
  let ctx = null;
  let requestedUrl;
  let next;

  beforeEach(() => {
    middleware = historyApiFallback();
    requestedUrl = "/foo";
    ctx = {
      request: {
        method: "GET",
        url: requestedUrl,
        URL: new URL(requestedUrl, BASE),
        headers: {
          accept: "text/html, */*",
        },
      },
    };
    next = sinon.stub();
  });

  ["POST", "PUT", "DELETE", "HEAD", "OPTIONS"].forEach((method) => {
    it(`must ignore ${method} requests`, () => {
      ctx.request.method = method;

      middleware(ctx, next);

      expect(ctx.request.url).toEqual(requestedUrl);
      expect(next.called).toEqual(true);
    });
  });

  it("should ignore requests that do not accept html", () => {
    ctx.request.headers.accept = "application/json";

    middleware(ctx, next);

    expect(ctx.request.url).toEqual(requestedUrl);
    expect(next.called).toEqual(true);
  });

  it("should ignore file requests", () => {
    var expected = (ctx.request.url = "js/app.js");
    ctx.request.URL = new URL(ctx.request.url, BASE);

    middleware(ctx, next);

    expect(ctx.request.url).toEqual(expected);
    expect(next.called).toEqual(true);
  });

  it("should rewrite requests with .", () => {
    ctx.request.url = "js/foo.bar/jkdsah321jkh";
    ctx.request.URL = new URL(ctx.request.url, BASE);

    middleware(ctx, next);

    expect(ctx.request.url).toEqual("/index.html");
    expect(next.called).toEqual(true);
  });

  it("should rewrite requests when the . rule is disabled", () => {
    ctx.request.url = "js/app.js";
    ctx.request.URL = new URL(ctx.request.url, BASE);
    middleware = historyApiFallback({
      disableDotRule: true,
    });
    middleware(ctx, next);

    expect(ctx.request.url).toEqual("/index.html");
    expect(next.called).toEqual(true);
  });

  it("should take JSON preference into account", () => {
    ctx.request.headers.accept = "application/json, text/plain, */*";

    middleware(ctx, next);

    expect(ctx.request.url).toEqual(requestedUrl);
    expect(next.called).toEqual(true);
  });

  it("should rewrite valid requests", () => {
    middleware(ctx, next);

    expect(ctx.request.url).toEqual("/index.html");
    expect(next.called).toEqual(true);
  });

  it("should not fail for missing HTTP accept header", () => {
    delete ctx.request.headers.accept;

    middleware(ctx, next);

    expect(ctx.request.url).toEqual(requestedUrl);
    expect(next.called).toEqual(true);
  });

  it("should not fail for missing headers object", () => {
    delete ctx.request.headers;

    middleware(ctx, next);

    expect(ctx.request.url).toEqual(requestedUrl);
    expect(next.called).toEqual(true);
  });

  it("should work in verbose mode", () => {
    var expected = (ctx.request.url = "js/app.js");
    ctx.request.URL = new URL(ctx.request.url, BASE);
    middleware = historyApiFallback({
      verbose: true,
    });

    middleware(ctx, next);

    expect(ctx.request.url).toEqual(expected);
    expect(next.called).toEqual(true);
  });

  it("should work with a custom logger", () => {
    var expected = (ctx.request.url = "js/app.js");
    ctx.request.URL = new URL(ctx.request.url, BASE);
    var logger = sinon.stub();
    middleware = historyApiFallback({
      logger: logger,
    });

    middleware(ctx, next);

    expect(ctx.request.url).toEqual(expected);
    expect(next.called).toEqual(true);
    expect(logger.calledOnce).toEqual(true);
  });

  it("should rewrite requested path according to rules", () => {
    ctx.request.url = "/soccer";
    ctx.request.URL = new URL(ctx.request.url, BASE);
    middleware = historyApiFallback({
      rewrites: [{ from: /\/soccer/, to: "/soccer.html" }],
    });

    middleware(ctx, next);

    expect(ctx.request.url).toEqual("/soccer.html");
    expect(next.called).toEqual(true);
  });

  it("should support functions as rewrite rule", () => {
    middleware = historyApiFallback({
      rewrites: [
        {
          from: /^\/libs\/(.*)$/,
          to: function (context) {
            return "./bower_components" + context.parsedUrl.pathname;
          },
        },
      ],
    });

    ctx.request.url = "/libs/jquery/jquery.1.12.0.min.js";
    ctx.request.URL = new URL(ctx.request.url, BASE);
    middleware(ctx, next);
    expect(ctx.request.url).toEqual(
      "./bower_components/libs/jquery/jquery.1.12.0.min.js"
    );
    expect(next.called).toEqual(true);

    next = sinon.stub();
    var expected = (ctx.request.url = "/js/main.js");
    ctx.request.URL = new URL(ctx.request.url, BASE);
    middleware(ctx, next);
    expect(ctx.request.url).toEqual(expected);
    expect(next.called).toEqual(true);
  });

  it("should test rewrite rules", () => {
    ctx.request.url = "/socer";
    ctx.request.URL = new URL(ctx.request.url, BASE);
    middleware = historyApiFallback({
      rewrites: [{ from: /\/soccer/, to: "/soccer.html" }],
    });

    middleware(ctx, next);

    expect(ctx.request.url).toEqual("/index.html");
    expect(next.called).toEqual(true);
  });

  it("should support custom index file", () => {
    var index = "default.html";
    ctx.request.url = "/socer";
    ctx.request.URL = new URL(ctx.request.url, BASE);
    middleware = historyApiFallback({
      index: index,
    });

    middleware(ctx, next);

    expect(ctx.request.url).toEqual(index);
    expect(next.called).toEqual(true);
  });

  it("should accept html requests based on headers option", () => {
    ctx.request.headers.accept = "*/*";
    middleware = historyApiFallback({
      htmlAcceptHeaders: ["text/html", "application/xhtml+xml"],
    });

    middleware(ctx, next);

    expect(ctx.request.url).toEqual(requestedUrl);
    expect(next.called).toEqual(true);
  });

  it("should support custom rewrite rules", () => {
    ctx.request.headers.accept = "*/*";
    var url = "/app/login/app.js";
    ctx.request.url = url;
    ctx.request.URL = new URL(ctx.request.url, BASE);

    middleware = historyApiFallback({
      rewrites: [
        {
          from: /\/app\/login/,
          to: function onMatch(ctx) {
            if (ctx.parsedUrl.pathname.indexOf(".js")) {
              return ctx.parsedUrl.pathname;
            }
            return "/app/login/index.html";
          },
        },
      ],
    });

    middleware(ctx, next);

    expect(ctx.request.url).toEqual(url);
    expect(next.called).toEqual(true);
  });
});
