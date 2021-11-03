/* redis-store.ts */

// Import the Session type from the library, along with the Node redis package, and `promisify` from Node
import { Session } from "@shopify/shopify-api/dist/auth/session";
const db = require("../../models");

export async function storeCallback(session) {
  try {
    const dbSession = await db.Session.findOne({
      where: { sessionId: session.id },
    });
    if (dbSession) {
      dbSession.shop = session.shop;
      dbSession.accessToken = session.accessToken;
      dbSession.sessionBody = JSON.stringify(session);
      await dbSession.save();
    } else {
      await db.Session.create({
        sessionId: session.id,
        shop: session.shop,
        accessToken: session.accessToken,
        sessionBody: JSON.stringify(session),
      });
    }
    return true;
  } catch (e) {
    console.log("got this error");
    throw new Error(e);
  }
}
export async function loadCallback(id) {
  try {
    const dbSession = await db.Session.findOne({ where: { sessionId: id } });
    if (dbSession) {
      return JSON.parse(dbSession.sessionBody);
    } else {
      console.log("missing.");
      return undefined;
    }
  } catch (err) {
    throw new Error(err);
  }
}
export async function deleteCallback(id) {
  try {
    await db.Session.destroy({
      where: {
        sessionId: id,
      },
    });
    return true;
  } catch (e) {
    throw new Error(e);
  }
}
