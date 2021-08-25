const Koa = require("koa");
const Router = require("koa-router");
const koaStatic = require("koa-static");
const history = require("../..");

const app = new Koa();
const router = new Router();

app.use(koaStatic("assets"));
app.use(
  history({
    disableDotRule: true,
    verbose: true,
  })
);
app.use(koaStatic("assets"));

router.get("/users/5.json", (ctx) => {
  ctx.body = {
    name: "Tom Mason",
  };
});
app.use(router.routes(), router.allowedMethods());
const port = 5555;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});
