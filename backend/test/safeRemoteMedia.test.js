import test from "node:test";
import assert from "node:assert/strict";
import {
  downloadSafeRemoteMedia,
  validateSafeRemoteUrl,
} from "../utils/safeRemoteMedia.js";

test("remote media rejects non-HTTPS and embedded credentials", async () => {
  await assert.rejects(
    downloadSafeRemoteMedia("http://example.com/file.jpg"),
    /must use HTTPS/,
  );
  await assert.rejects(
    downloadSafeRemoteMedia("https://user:secret@example.com/file.jpg"),
    /must not contain credentials/,
  );
});

test("remote media rejects loopback and reserved literal addresses", async () => {
  await assert.rejects(
    downloadSafeRemoteMedia("https://127.0.0.1/file.jpg"),
    /private or reserved/,
  );
  await assert.rejects(
    downloadSafeRemoteMedia("https://169.254.169.254/latest/meta-data"),
    /private or reserved/,
  );
  await assert.rejects(
    downloadSafeRemoteMedia("https://192.0.2.10/file.jpg"),
    /private or reserved/,
  );
});

test("local webhook targets are allowed only when explicitly enabled", async () => {
  await assert.rejects(
    validateSafeRemoteUrl("http://localhost:3000/webhook"),
    /must use HTTPS/,
  );
  await assert.doesNotReject(
    validateSafeRemoteUrl("http://localhost:3000/webhook", {
      allowHttp: true,
      allowPrivateLocal: true,
      allowedHosts: [],
    }),
  );
});
