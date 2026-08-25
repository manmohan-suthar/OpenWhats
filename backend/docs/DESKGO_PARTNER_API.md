# DeskGo WhatsApp Business Partner API

OpenWhats is the WhatsApp transport and live-chat provider. DeskGo owns Pilot,
CRM context, prompts, workflows, follow-ups, subscription billing, numeric
resource limits, and usage reservations.

## OpenWhats admin configuration

The `DESKGO_*` environment variables are secure defaults/fallbacks. An
OpenWhats admin can override the partner ID and webhook URL from
**Admin → System Settings → DeskGo Partner Integration**. DeskGo and EasyFlow
first-party origins are trusted by default for partner sync:

- `https://deskgo.in`
- `https://easyflow.suthartech.com`

Set `DESKGO_TRUSTED_ORIGINS` only when adding another first-party deployment.
Legacy signing and key-derivation secrets remain optional fallbacks.

## Managed tenant provisioning

`POST /api/partner/v1/tenants/provision`

Use the partner headers documented below. Example body:

```json
{
  "eventId": "evt_company_provision_001",
  "externalCompanyId": "deskgo-company-uuid",
  "companyName": "Example Company",
  "ownerEmail": "owner@example.com",
  "credentialVersion": 1
}
```

This idempotently creates a partner-managed OpenWhats user, suspended tenant,
and scoped API key. Partner-managed users cannot sign in to OpenWhats. DeskGo
must keep the returned key in encrypted server-side secret storage.

The managed credential is derived from company ID and `credentialVersion`. If
`DESKGO_API_KEY_DERIVATION_SECRET` is configured, OpenWhats uses it as a legacy
HMAC secret; otherwise it uses deterministic first-party derivation. A retry
returns the same key; increment the version to rotate it and revoke the prior
managed credential. Older versions are rejected. Call entitlement sync after
provisioning to activate access.

## Entitlement sync

`POST /api/partner/v1/entitlements/sync`

Required headers for first-party DeskGo/EasyFlow:

```http
Content-Type: application/json
X-Partner-Id: deskgo
X-Partner-Event-Id: evt_unique_id
X-Partner-Timestamp: 1784975400
X-Partner-Origin: https://deskgo.in
```

Optional legacy signed requests may send:

```http
X-Partner-Signature: sha256=<hex hmac>
```

The legacy signature is:

```text
hex(HMAC-SHA256(DESKGO_PARTNER_SECRET, timestamp + "." + exactJsonBody))
```

Requests older/newer than five minutes are rejected. `eventId` is idempotent;
reusing it with another payload returns a conflict.

Example:

```json
{
  "eventId": "evt_unique_id",
  "eventType": "subscription.synchronized",
  "eventVersion": 1,
  "externalCompanyId": "deskgo-company-uuid",
  "email": "existing-openwhats-user@example.com",
  "moduleKey": "whatsapp-business",
  "status": "active",
  "currentPeriodStart": "2026-07-25T00:00:00.000Z",
  "currentPeriodEnd": "2026-08-25T00:00:00.000Z",
  "features": [
    "whatsapp-session-management",
    "whatsapp-live-chat",
    "whatsapp-send-message",
    "whatsapp-contacts-groups",
    "whatsapp-media-messaging",
    "whatsapp-integrations"
  ],
  "limits": {},
  "webhookEnabled": true
}
```

Use either `openWhatsUserId` or the existing OpenWhats account `email`.
OpenWhats does not silently create a user from a partner event.

## Subscription behavior

When a user has a partner tenant record, OpenWhats does not create or use its
internal Demo/Basic/Pro subscription for session/message decisions. It enforces
the signed DeskGo lifecycle status, entitlement period, and explicit feature
allowlist. Numeric limits are never evaluated or consumed in OpenWhats; DeskGo
atomically reserves and consumes those limits before calling the provider.

DeskGo sends an explicit `suspended` entitlement with empty features,
`limits: {}`, and `webhookEnabled: false` when the WhatsApp Business service expires,
is removed, or loses access. Existing managed accounts are retained for safe
reactivation, but their provider API operations are rejected while suspended.
Entitlement sync should include the provisioned `openWhatsUserId`; this keeps
the mapping stable even if the DeskGo company administrator email changes.

The built-in OpenWhats agent and workflow products are blocked for partner
tenants. Incoming WhatsApp messages are persisted and delivered to DeskGo;
OpenWhats does not auto-reply.

## Outbound real-time events

OpenWhats sends events to `DESKGO_WEBHOOK_URL`:

- `whatsapp.message.received`
- `whatsapp.message.sent`
- `whatsapp.message.status`
- `whatsapp.session.status`
- `whatsapp.interactive.response`

Headers:

```http
X-OpenWhats-Event-Id: <uuid>
X-OpenWhats-Timestamp: <unix seconds>
X-OpenWhats-Signature: sha256=<hex hmac>
```

Signature verification uses the exact body and `DESKGO_WEBHOOK_SECRET` with
the same `timestamp + "." + body` format. Deliveries use a persistent MongoDB
outbox, a ten-second timeout, exponential retry, and a maximum of eight tries.

Message events include a normalized transport payload. Media is represented by
metadata and a private OpenWhats upload path. Partner media under
`/uploads/private/...` is deliberately blocked by the public static server.
DeskGo must fetch the path through its server-side proxy using the authenticated
provider endpoint below; the managed tenant key must never reach a browser.

```json
{
  "session": {
    "sessionId": "wa_session_id",
    "phoneNumber": "919876543210"
  },
  "chat": {
    "chatJid": "919123456789@s.whatsapp.net",
    "isGroup": false,
    "participantJid": null
  },
  "contact": {
    "phoneNumber": "919123456789",
    "displayName": "Customer"
  },
  "message": {
    "messageId": "provider_message_id",
    "direction": "in",
    "type": "image",
    "text": "Optional caption",
    "timestamp": "2026-08-01T12:00:00.000Z",
    "media": {
      "type": "image",
      "url": "/uploads/messages/private-file.jpg",
      "name": "photo.jpg",
      "caption": "Optional caption"
    }
  }
}
```

The `media` object is omitted for text-only messages. A null or unavailable
media URL is metadata-only content, not a successful public download.
`whatsapp.message.sent` mirrors phone-originated outbound messages so DeskGo
history stays complete when a user sends directly from WhatsApp.

Authenticated media fetch:

```http
GET /api/v1/media?path=%2Fuploads%2Fprivate%2F...
X-API-Key: <managed tenant key>
```

The API validates the tenant owner and requires that the exact path is
referenced by one of that tenant's chat messages. It does not accept traversal,
symlink escapes, unreferenced files, or files above the provider size bound.

DeskGo must deduplicate by `X-OpenWhats-Event-Id`, persist the message first,
then enqueue Pilot processing. Pilot replies are sent through:

```http
POST /api/v1/sessions/:sessionId/chats/:encodedChatJid/messages
```

The OpenWhats API key needs `send_messages`; the entitlement needs
`whatsapp-send-message`. Every API-key mutation for text, media, interactive
messages, session creation, and number-list create/update requires a stable
`Idempotency-Key` between 8 and 180 safe characters. Replaying the same
succeeded request returns its stored response without repeating the provider
mutation; reusing the key with a different payload is rejected. Receipts are
retained for at least 30 days by default and can be extended with
`PROVIDER_IDEMPOTENCY_RETENTION_DAYS`.

## Pilot interactive replies

DeskGo Pilot sends quick actions through the owned-session provider endpoint:

```http
POST /api/v1/sessions/:sessionId/chats/:encodedChatJid/interactive
X-API-Key: <managed tenant key>
Idempotency-Key: <stable unique key for this intended send>
Content-Type: application/json
```

```json
{
  "type": "quick_reply",
  "data": {
    "title": "Customer Support",
    "body": "Create a support ticket?",
    "footer": "DeskGo Pilot",
    "fallbackText": "Reply 1 for Yes or 2 for No.",
    "buttons": [
      { "id": "opaque-action-token-yes", "text": "Yes" },
      { "id": "opaque-action-token-no", "text": "No" }
    ]
  }
}
```

The managed key needs `send_interactive_messages`. Supported types are exposed
by `GET /api/v1/interactive/types`. OpenWhats currently accepts `quick_reply`,
`list`, `cta_url`, `cta_call`, and allowlisted `native_flow` single-select
messages. It validates session ownership and connected state before resolving
the socket.

The idempotency key is required. Repeating the exact succeeded request returns
the original provider message ID without sending again. Reusing a key with a
different body is rejected. An uncertain/processing or failed request must not
be retried with a new key unless DeskGo intentionally wants a new message.

Button, list, and native-flow selections are normalized into
`whatsapp.interactive.response`. The event includes the session/chat, incoming
message, opaque action ID, label, response type, and original message ID when
WhatsApp provides it. DeskGo must still validate its signed/opaque action token,
identity, expiry, permissions, and current business state before executing an
action.
