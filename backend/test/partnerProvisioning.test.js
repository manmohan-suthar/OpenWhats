import test from "node:test";
import assert from "node:assert/strict";
import { deriveRawKey } from "../services/PartnerProvisioningService.js";

test("managed partner credentials are deterministic and versioned", () => {
  const previous = process.env.DESKGO_API_KEY_DERIVATION_SECRET;
  process.env.DESKGO_API_KEY_DERIVATION_SECRET =
    "test-only-derivation-secret-with-32-characters";

  const first = deriveRawKey("deskgo", "company-1", 1);
  const retry = deriveRawKey("deskgo", "company-1", 1);
  const rotated = deriveRawKey("deskgo", "company-1", 2);

  assert.equal(first, retry);
  assert.notEqual(first, rotated);
  assert.match(first, /^wac_live_[a-f0-9]{48}$/);

  process.env.DESKGO_API_KEY_DERIVATION_SECRET = previous;
});
