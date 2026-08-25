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

function restoreEnv(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
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
  restoreEnv("DESKGO_PARTNER_SECRET", previous);
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
  restoreEnv("DESKGO_PARTNER_SECRET", previous);
});

test("partnerAuth accepts unsigned trusted first-party DeskGo origin", async () => {
  const previousSecret = process.env.DESKGO_PARTNER_SECRET;
  const previousOrigins = process.env.DESKGO_TRUSTED_ORIGINS;
  delete process.env.DESKGO_PARTNER_SECRET;
  delete process.env.DESKGO_TRUSTED_ORIGINS;
  const body = { eventId: "evt_test_3" };
  const req = {
    body,
    rawBody: Buffer.from(JSON.stringify(body)),
    headers: {
      "x-partner-id": "deskgo",
      "x-partner-event-id": "evt_test_3",
      "x-partner-timestamp": String(Math.floor(Date.now() / 1000)),
      "x-partner-origin": "https://deskgo.in",
    },
  };
  const res = responseRecorder();
  let called = false;
  await partnerAuth(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
  assert.equal(req.partner, "deskgo");
  assert.equal(req.partnerAuthMode, "trusted-origin");
  restoreEnv("DESKGO_PARTNER_SECRET", previousSecret);
  restoreEnv("DESKGO_TRUSTED_ORIGINS", previousOrigins);
});

test("partnerAuth rejects unsigned untrusted partner origins", async () => {
  const previousSecret = process.env.DESKGO_PARTNER_SECRET;
  delete process.env.DESKGO_PARTNER_SECRET;
  const body = { eventId: "evt_test_4" };
  const req = {
    body,
    rawBody: Buffer.from(JSON.stringify(body)),
    headers: {
      "x-partner-id": "deskgo",
      "x-partner-event-id": "evt_test_4",
      "x-partner-timestamp": String(Math.floor(Date.now() / 1000)),
      "x-partner-origin": "https://example.com",
    },
  };
  const res = responseRecorder();
  let called = false;
  await partnerAuth(req, res, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.code, "UNTRUSTED_PARTNER_ORIGIN");
  restoreEnv("DESKGO_PARTNER_SECRET", previousSecret);
});

test("partnerAuth accepts unsigned localhost origin only outside production", async () => {
  const previousSecret = process.env.DESKGO_PARTNER_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  delete process.env.DESKGO_PARTNER_SECRET;
  process.env.NODE_ENV = "development";
  const body = { eventId: "evt_test_5" };
  const req = {
    body,
    rawBody: Buffer.from(JSON.stringify(body)),
    headers: {
      "x-partner-id": "deskgo",
      "x-partner-event-id": "evt_test_5",
      "x-partner-timestamp": String(Math.floor(Date.now() / 1000)),
      "x-partner-origin": "http://localhost:3000",
    },
  };
  const res = responseRecorder();
  let called = false;
  await partnerAuth(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
  assert.equal(req.partnerAuthMode, "trusted-origin");
  restoreEnv("DESKGO_PARTNER_SECRET", previousSecret);
  restoreEnv("NODE_ENV", previousNodeEnv);
});

test("partnerAuth rejects unsigned localhost origin in production", async () => {
  const previousSecret = process.env.DESKGO_PARTNER_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  delete process.env.DESKGO_PARTNER_SECRET;
  process.env.NODE_ENV = "production";
  const body = { eventId: "evt_test_6" };
  const req = {
    body,
    rawBody: Buffer.from(JSON.stringify(body)),
    headers: {
      "x-partner-id": "deskgo",
      "x-partner-event-id": "evt_test_6",
      "x-partner-timestamp": String(Math.floor(Date.now() / 1000)),
      "x-partner-origin": "http://localhost:3000",
    },
  };
  const res = responseRecorder();
  let called = false;
  await partnerAuth(req, res, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.code, "UNTRUSTED_PARTNER_ORIGIN");
  restoreEnv("DESKGO_PARTNER_SECRET", previousSecret);
  restoreEnv("NODE_ENV", previousNodeEnv);
});
