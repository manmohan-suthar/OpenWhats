import test from "node:test";
import assert from "node:assert/strict";
import {
  extractInteractiveResponse,
  interactiveResponseText,
  unwrapMessageContent,
} from "../utils/interactiveResponse.js";

test("extracts a quick reply and original message correlation", () => {
  const response = extractInteractiveResponse({
    message: {
      ephemeralMessage: {
        message: {
          buttonsResponseMessage: {
            selectedButtonId: "opaque-action.yes",
            selectedDisplayText: "Yes",
            contextInfo: { stanzaId: "OUTBOUND-1" },
          },
        },
      },
    },
  });
  assert.equal(response.type, "quick_reply");
  assert.equal(response.actionId, "opaque-action.yes");
  assert.equal(response.label, "Yes");
  assert.equal(response.originalMessageId, "OUTBOUND-1");
  assert.equal(interactiveResponseText(response), "Yes");
});

test("extracts list selection IDs", () => {
  const response = extractInteractiveResponse({
    message: {
      listResponseMessage: {
        title: "Booking",
        singleSelectReply: { selectedRowId: "service:booking" },
        contextInfo: { stanzaId: "OUTBOUND-2" },
      },
    },
  });
  assert.equal(response.type, "list");
  assert.equal(response.actionId, "service:booking");
  assert.equal(response.originalMessageId, "OUTBOUND-2");
});

test("extracts native-flow params without trusting raw provider JSON", () => {
  const response = extractInteractiveResponse({
    message: {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            nativeFlowResponseMessage: {
              name: "single_select",
              paramsJson: JSON.stringify({
                id: "ticket:create",
                title: "Create ticket",
              }),
            },
            contextInfo: { stanzaId: "OUTBOUND-3" },
          },
        },
      },
    },
  });
  assert.equal(response.type, "single_select");
  assert.equal(response.actionId, "ticket:create");
  assert.equal(response.label, "Create ticket");
  assert.equal(response.originalMessageId, "OUTBOUND-3");
});

test("unwraps nested ephemeral and view-once message content", () => {
  const content = unwrapMessageContent({
    message: {
      ephemeralMessage: {
        message: {
          viewOnceMessage: {
            message: { conversation: "hello" },
          },
        },
      },
    },
  });
  assert.equal(content.conversation, "hello");
});
