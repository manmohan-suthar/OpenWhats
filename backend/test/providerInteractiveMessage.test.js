import test from "node:test";
import assert from "node:assert/strict";
import {
  getProviderInteractiveCapabilities,
  normalizeProviderInteractivePayload,
} from "../services/ProviderInteractiveMessageService.js";

test("normalizes a safe Pilot quick reply payload", () => {
  const result = normalizeProviderInteractivePayload({
    type: "quick_reply",
    data: {
      title: "Support",
      body: "Create a ticket?",
      buttons: [
        { id: "pilot-action.yes", text: "Yes" },
        { actionId: "pilot-action.no", label: "No" },
      ],
    },
  });

  assert.equal(result.type, "quick_reply");
  assert.deepEqual(result.data.buttons, [
    { id: "pilot-action.yes", text: "Yes" },
    { id: "pilot-action.no", text: "No" },
  ]);
});

test("rejects unsafe action IDs and too many quick replies", () => {
  assert.throws(
    () =>
      normalizeProviderInteractivePayload({
        type: "quick_reply",
        data: {
          body: "Choose",
          buttons: [{ id: "has spaces", text: "Bad" }],
        },
      }),
    /may contain only/,
  );
  assert.throws(
    () =>
      normalizeProviderInteractivePayload({
        type: "quick_reply",
        data: {
          body: "Choose",
          buttons: [1, 2, 3, 4].map((id) => ({ id: `id-${id}`, text: `${id}` })),
        },
      }),
    /1 to 3 buttons/,
  );
});

test("allows only HTTPS CTA URLs without embedded credentials", () => {
  assert.throws(
    () =>
      normalizeProviderInteractivePayload({
        type: "cta_url",
        data: {
          body: "Open",
          buttons: [{ text: "Open", url: "http://example.com" }],
        },
      }),
    /must use HTTPS/,
  );
  assert.throws(
    () =>
      normalizeProviderInteractivePayload({
        type: "cta_url",
        data: {
          body: "Open",
          buttons: [{ text: "Open", url: "https://user:pass@example.com" }],
        },
      }),
    /must not contain credentials/,
  );
});

test("normalizes bounded list and native-flow selections", () => {
  const list = normalizeProviderInteractivePayload({
    type: "list",
    data: {
      body: "Select service",
      buttonText: "Services",
      sections: [
        {
          title: "Available",
          rows: [{ id: "service:booking", title: "Booking" }],
        },
      ],
    },
  });
  assert.equal(list.data.sections[0].rows[0].id, "service:booking");

  const flow = normalizeProviderInteractivePayload({
    type: "native_flow",
    data: {
      body: "Select service",
      buttonText: "Continue",
      flowName: "single_select",
      sections: [
        {
          title: "Available",
          rows: [{ id: "service:support", title: "Support" }],
        },
      ],
    },
  });
  assert.equal(flow.data.flowName, "single_select");
});

test("publishes the conservative provider capability contract", () => {
  const capabilities = getProviderInteractiveCapabilities();
  assert.deepEqual(capabilities.types, [
    "quick_reply",
    "list",
    "cta_url",
    "cta_call",
    "native_flow",
  ]);
  assert.equal(capabilities.limits.quickReplyButtons, 3);
});
