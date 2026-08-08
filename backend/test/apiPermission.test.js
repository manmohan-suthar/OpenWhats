import test from "node:test";
import assert from "node:assert/strict";
import apiPermission from "../middleware/apiPermission.js";
import {
  API_PERMISSIONS,
  PARTNER_MANAGED_API_PERMISSIONS,
} from "../constants/apiPermissions.js";

const invoke = ({ authMode = "api-key", permissions = [] } = {}) => {
  const req = { authMode, apiKey: { permissions } };
  let statusCode = 200;
  let payload;
  let nextCalled = false;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };

  apiPermission("read_chats")(req, res, () => {
    nextCalled = true;
  });

  return { statusCode, payload, nextCalled };
};

test("allows an API key with the required permission", () => {
  assert.equal(
    invoke({ permissions: ["read_chats"] }).nextCalled,
    true,
  );
});

test("allows a wildcard API key", () => {
  assert.equal(invoke({ permissions: ["*"] }).nextCalled, true);
});

test("denies an API key without the required permission", () => {
  const result = invoke({ permissions: ["send_messages"] });
  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 403);
  assert.equal(result.payload.code, "API_KEY_PERMISSION_DENIED");
});

test("does not change dashboard JWT authorization", () => {
  assert.equal(invoke({ authMode: "jwt" }).nextCalled, true);
});

test("exposes a dedicated interactive-message API permission", () => {
  assert.equal(API_PERMISSIONS.includes("send_interactive_messages"), true);
  assert.equal(
    PARTNER_MANAGED_API_PERMISSIONS.includes("send_interactive_messages"),
    true,
  );
});
