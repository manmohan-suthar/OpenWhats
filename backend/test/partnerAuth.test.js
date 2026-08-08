import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import partnerAuth from "../middleware/partnerAuth.js";

function responseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

test("partnerAuth accepts a current correctly signed request", async () => {
  const previous = process.env.DESKGO_PARTNER_SECRET;
  process.env.DESKGO_PARTNER_SECRET = "test-secret";
  const body = { eventId: "evt_test_1", status: "active" };
  const rawBody = Buffer.from(JSON.stringify(body));
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto
    .createHmac("sha256", "test-secret")
    .update(`${timestamp}.${rawBody.toString("utf8")}`)
    .digest("hex");
  const req = {
    body,
    rawBody,
    headers: {
      "x-partner-id": "deskgo",
      "x-partner-event-id": "evt_test_1",
      "x-partner-timestamp": timestamp,
      "x-partner-signature": `sha256=${signature}`,
    },
  };
  const res = responseRecorder();
  let called = false;
  await partnerAuth(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
  assert.equal(req.partner, "deskgo");
  process.env.DESKGO_PARTNER_SECRET = previous;
});

test("partnerAuth rejects an invalid signature", async () => {
  const previous = process.env.DESKGO_PARTNER_SECRET;
  process.env.DESKGO_PARTNER_SECRET = "test-secret";
  const body = { eventId: "evt_test_2" };
  const req = {
    body,
    rawBody: Buffer.from(JSON.stringify(body)),
    headers: {
      "x-partner-id": "deskgo",
      "x-partner-event-id": "evt_test_2",
      "x-partner-timestamp": String(Math.floor(Date.now() / 1000)),
      "x-partner-signature": "sha256=invalid",
    },
  };
  const res = responseRecorder();
  let called = false;
  await partnerAuth(req, res, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.code, "INVALID_PARTNER_SIGNATURE");
  process.env.DESKGO_PARTNER_SECRET = previous;
});
