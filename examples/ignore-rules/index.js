const Koa = require("koa");
const Router = require("koa-router");
const koaStatic = require("koa-static");
const history = require("../..");
const path = require("path");
const fs = require("fs");

const app = new Koa();
const router = new Router();

app.use(koaStatic("assets"));

const historyMiddleware = history({
  disableDotRule: true,
  verbose: true,
});
app.use(async (ctx, next) => {
  // This is the ignore rule. You can do whatever checks you feel are necessary, e.g.
  // check headers, req path, external vars…
  if (ctx.request.path === "/signOut") {
    await next();
  } else {
    historyMiddleware(ctx, next);
  }
});

app.use(koaStatic("assets"));

router.get("/users/5.json", (ctx) => {
  ctx.body = {
    name: "Tom Mason",
  };
});

router.get("/signOut", async (ctx) => {
  console.log("custom signOut rule");
  const content = await new Promise((resolve, reject) => {
    fs.readFile(
      path.join(__dirname, "assets", "signOut.html"),
      "utf-8",
      (err, content) => {
        if (err) {
          reject("file error");
        }

        resolve(content);
      }
    );
  });
  ctx.body = content;
});

app.use(router.routes(), router.allowedMethods());
const port = 5555;
app.listen(port, () => {
  console.log(`Example app listening on port ${5555}!`);
});
