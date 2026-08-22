import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveManagedAccountEmail,
  deriveRawKey,
} from "../services/PartnerProvisioningService.js";

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

test("managed partner account identities are unique per company", () => {
  const first = deriveManagedAccountEmail("deskgo", "company-1");
  const retry = deriveManagedAccountEmail("deskgo", "company-1");
  const secondCompany = deriveManagedAccountEmail("deskgo", "company-2");
  const secondPartner = deriveManagedAccountEmail("other-partner", "company-1");

  assert.equal(first, retry);
  assert.notEqual(first, secondCompany);
  assert.notEqual(first, secondPartner);
  assert.match(first, /^managed-deskgo-[a-f0-9]{32}@deskgo\.in$/);
});

test("managed partner account identities support a configured domain", () => {
  assert.match(
    deriveManagedAccountEmail("deskgo", "company-1", "internal.deskgo.in"),
    /@internal\.deskgo\.in$/,
  );
});
