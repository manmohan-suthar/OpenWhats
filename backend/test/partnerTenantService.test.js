import test from "node:test";
import assert from "node:assert/strict";
import PartnerTenantService from "../services/PartnerTenantService.js";

test("partner entitlement requires an explicitly granted feature", () => {
  const tenant = { features: ["whatsapp-live-chat"] };
  assert.equal(
    PartnerTenantService.hasFeature(tenant, "whatsapp-live-chat"),
    true,
  );
  assert.equal(
    PartnerTenantService.hasFeature(tenant, "whatsapp-send-message"),
    false,
  );
});

test("active partner entitlement is usable inside its period", () => {
  const tenant = {
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 60_000),
  };
  assert.equal(PartnerTenantService.isUsable(tenant), true);
});

test("expired partner period is not usable without grace", () => {
  const tenant = {
    status: "active",
    currentPeriodEnd: new Date(Date.now() - 60_000),
  };
  assert.equal(PartnerTenantService.isUsable(tenant), false);
});

