import test from "node:test";
import assert from "node:assert/strict";
import { resolveBaileysLogLevel } from "../utils/baileysLogger.js";

test("Baileys logging defaults to warn", () => {
  assert.equal(resolveBaileysLogLevel(undefined), "warn");
  assert.equal(resolveBaileysLogLevel(""), "warn");
});

test("Baileys logging accepts supported levels case-insensitively", () => {
  assert.equal(resolveBaileysLogLevel("ERROR"), "error");
  assert.equal(resolveBaileysLogLevel(" silent "), "silent");
});

test("Baileys logging rejects unknown levels safely", () => {
  assert.equal(resolveBaileysLogLevel("verbose"), "warn");
});
