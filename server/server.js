import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import Shopify, { ApiVersion } from "@shopify/shopify-api";
import Koa from "koa";
import next from "next";
import Router from "koa-router";
import { storeCallback, deleteCallback, loadCallback } from "./utils/DBStore";
import { shopifyGraphQLProxy } from "./utils/shopifyGraphQLProxy";
import isVerified from "shopify-jwt-auth-verify";
const jwt = require("jsonwebtoken");

dotenv.config();
const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev,
});
const handle = app.getRequestHandler();

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES.split(","),
  HOST_NAME: process.env.HOST.replace(/https:\/\//, ""),
  API_VERSION: process.env.API_VERSION,
  IS_EMBEDDED_APP: true,
  // This should be replaced with your preferred storage strategy
  // https://github.com/Shopify/shopify-node-api/blob/main/docs/usage/customsessions.md
  SESSION_STORAGE: new Shopify.Session.CustomSessionStorage(
    storeCallback,
    loadCallback,
    deleteCallback
  ),
});

// Storing the currently active shops in memory will force them to re-login when your server restarts. You should
// persist this object in your app.
// const ACTIVE_SHOPIFY_SHOPS = {};

app.prepare().then(async () => {
  const server = new Koa();
  const router = new Router();
  server.keys = [Shopify.Context.API_SECRET_KEY];
  server.use(
    createShopifyAuth({
      accessMode: "offline",
      async afterAuth(ctx) {
        // Access token and shop available in ctx.state.shopify
        const { shop, accessToken, scope } = ctx.state.shopify;
        const host = ctx.query.host;

        const response = await Shopify.Webhooks.Registry.register({
          shop,
          accessToken,
          path: "/webhooks",
          topic: "APP_UNINSTALLED",
          webhookHandler: async (topic, shop, body) =>
            await Shopify.Utils.deleteOfflineSession(shop),
        });

        if (!response.success) {
          console.log(
            `Failed to register APP_UNINSTALLED webhook: ${response.result}`
          );
        }

        // Redirect to app with shop parameter upon auth
        ctx.redirect(`/?shop=${shop}&host=${host}`);
      },
    })
  );

  const handleRequest = async (ctx) => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  };

  router.get("/", async (ctx) => {
    const shop = ctx.query.shop;
    const session = await Shopify.Utils.loadOfflineSession(shop);
    // This shop hasn't been seen yet, go through OAuth to create a session
    if (!session || !session.scope) {
      ctx.redirect(`/auth?shop=${shop}`);
    } else {
      await handleRequest(ctx);
    }
  });

  router.post("/webhooks", async (ctx) => {
    try {
      await Shopify.Webhooks.Registry.process(ctx.req, ctx.res);
      console.log(`Webhook processed, returned status code 200`);
    } catch (error) {
      console.log(`Failed to process webhook: ${error}`);
    }
  });

  router.post(
    "/graphql",
    verifyRequest({ accessMode: "offline" }),
    async (ctx, next) => {
      // await Shopify.Utils.graphqlProxy(ctx.req, ctx.res);
      const bearer = ctx.request.header.authorization;
      const secret = Shopify.Context.API_SECRET_KEY;
      const valid = isVerified(bearer, secret);
      if (valid) {
        const token = bearer.split(" ")[1];
        const decoded = jwt.decode(token);
        const shop = new URL(decoded.dest).host;
        const session = await Shopify.Utils.loadOfflineSession(shop);
        const proxy = shopifyGraphQLProxy({
          shop: shop,
          password: session.accessToken,
          version: Shopify.Context.API_VERSION,
        });
        await proxy(ctx, next);
      } else {
        ctx.res.statusCode = 403;
      }
    }
  );

  router.get("(/_next/static/.*)", handleRequest); // Static content is clear
  router.get("/_next/webpack-hmr", handleRequest); // Webpack content is clear
  router.get("(.*)", verifyRequest({ accessMode: "offline" }), handleRequest); // Everything else must have sessions

  server.use(router.allowedMethods());
  server.use(router.routes());
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
