import test from "node:test";
import assert from "node:assert/strict";
import { validateProviderMediaPath } from "../controllers/providerMediaController.js";

test("accepts only the authenticated tenant's private media namespace", () => {
  assert.equal(
    validateProviderMediaPath(
      "/uploads/private/507f1f77bcf86cd799439011/file.jpg",
      "507f1f77bcf86cd799439011",
    ),
    "/uploads/private/507f1f77bcf86cd799439011/file.jpg",
  );
  assert.throws(
    () =>
      validateProviderMediaPath(
        "/uploads/private/507f1f77bcf86cd799439012/file.jpg",
        "507f1f77bcf86cd799439011",
      ),
    (error) => error?.code === "MEDIA_NOT_FOUND" && error?.statusCode === 404,
  );
});

test("rejects traversal and normalized-path ambiguity", () => {
  for (const value of [
    "/uploads/../secrets.txt",
    "/uploads/private//file.jpg",
    "/uploads/private/./file.jpg",
    "https://example.com/file.jpg",
  ]) {
    assert.throws(
      () => validateProviderMediaPath(value, "507f1f77bcf86cd799439011"),
      (error) => error?.code === "INVALID_MEDIA_PATH",
    );
  }
});
