/**
 * ============================================
 * FRONTEND INTEGRATION GUIDE
 * ============================================
 *
 * This file shows how to integrate the unified
 * interactive messages API on the frontend
 */

/**
 * Universal Interactive Message Sender
 *
 * Usage:
 * const result = await sendInteractiveMessage({
 *   sessionId: 'wa_123',
 *   to: '918888888888',
 *   type: 'quick_reply',
 *   data: { ... }
 * });
 */
async function sendInteractiveMessage(config) {
  try {
    const response = await fetch("/api/messages/interactive", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Unknown error");
    }

    return data;
  } catch (error) {
    console.error("Failed to send interactive message:", error);
    throw error;
  }
}

/**
 * ============================================
 * QUICK REPLY SENDER
 * ============================================
 */
async function sendQuickReplyMessage(sessionId, to, body, buttons, footer) {
  return sendInteractiveMessage({
    sessionId,
    to,
    type: "quick_reply",
    data: {
      body,
      footer: footer || "Select an option",
      buttons: buttons.map((text, idx) => ({
        id: `button_${idx}`,
        text,
      })),
    },
  });
}

// Usage:
// await sendQuickReplyMessage(
//   'wa_123',
//   '918888888888',
//   'What do you need?',
//   ['Pricing', 'Support', 'Demo'],
//   'Quick Response'
// );

/**
 * ============================================
 * CTA URL SENDER
 * ============================================
 */
async function sendURLButtonMessage(sessionId, to, body, ctaButtons, footer) {
  return sendInteractiveMessage({
    sessionId,
    to,
    type: "cta_url",
    data: {
      body,
      footer: footer || "Click the button",
      buttons: ctaButtons.map((btn) => ({
        text: btn.text,
        url: btn.url,
      })),
    },
  });
}

// Usage:
// await sendURLButtonMessage(
//   'wa_123',
//   '918888888888',
//   'Check out our website',
//   [
//     { text: 'Visit Site', url: 'https://suthartech.com' },
//     { text: 'Download App', url: 'https://app.store' }
//   ]
// );

/**
 * ============================================
 * CALL BUTTON SENDER
 * ============================================
 */
async function sendCallButtonMessage(sessionId, to, body, callButtons, footer) {
  return sendInteractiveMessage({
    sessionId,
    to,
    type: "cta_call",
    data: {
      body,
      footer: footer || "Tap to call",
      buttons: callButtons.map((btn) => ({
        text: btn.text,
        phone: btn.phone,
      })),
    },
  });
}

// Usage:
// await sendCallButtonMessage(
//   'wa_123',
//   '918888888888',
//   'Need help?',
//   [{ text: 'Call Support', phone: '+919876543210' }]
// );

/**
 * ============================================
 * LIST MESSAGE SENDER
 * ============================================
 */
async function sendListMessage(sessionId, to, body, sections, options = {}) {
  return sendInteractiveMessage({
    sessionId,
    to,
    type: "list",
    data: {
      body,
      title: options.title || "Menu",
      footer: options.footer || "Select an option",
      buttonText: options.buttonText || "View Options",
      sections,
    },
  });
}

// Usage:
// await sendListMessage(
//   'wa_123',
//   '918888888888',
//   'What can we help with?',
//   [
//     {
//       title: 'Services',
//       rows: [
//         { id: 'web', title: 'Web Development' },
//         { id: 'mobile', title: 'Mobile App' }
//       ]
//     }
//   ],
//   { title: 'Our Services', footer: 'Choose one' }
// );

/**
 * ============================================
 * NATIVE FLOW SENDER
 * ============================================
 */
async function sendNativeFlowMessage(
  sessionId,
  to,
  title,
  body,
  buttons,
  footer,
) {
  return sendInteractiveMessage({
    sessionId,
    to,
    type: "native_flow",
    data: {
      title,
      body,
      footer: footer || "Select your choice",
      buttons,
    },
  });
}

// Usage:
// await sendNativeFlowMessage(
//   'wa_123',
//   '918888888888',
//   'Choose Plan',
//   'Select your subscription plan',
//   [
//     {
//       name: 'single_select',
//       params: {
//         title: 'Available Plans',
//         sections: [
//           {
//             title: 'Pricing',
//             rows: [
//               { id: 'starter', title: 'Starter - ₹999' },
//               { id: 'pro', title: 'Pro - ₹2999' }
//             ]
//           }
//         ]
//       }
//     }
//   ],
//   'Suthar Tech'
// );

/**
 * ============================================
 * CAROUSEL SENDER
 * ============================================
 */
async function sendCarouselMessage(sessionId, to, cards) {
  return sendInteractiveMessage({
    sessionId,
    to,
    type: "carousel",
    data: {
      cards: cards.map((card) => ({
        title: card.title,
        body: card.body,
        footer: card.footer,
        buttons: card.buttons || [],
      })),
    },
  });
}

// Usage:
// await sendCarouselMessage(
//   'wa_123',
//   '918888888888',
//   [
//     {
//       title: 'Plan 1',
//       body: 'Basic features',
//       footer: '₹999/mo',
//       buttons: [{ text: 'Choose', url: 'https://checkout.com/plan1' }]
//     },
//     {
//       title: 'Plan 2',
//       body: 'Pro features',
//       footer: '₹2999/mo',
//       buttons: [{ text: 'Choose', url: 'https://checkout.com/plan2' }]
//     }
//   ]
// );

/**
 * ============================================
 * PAYMENT SENDER
 * ============================================
 */
async function sendPaymentMessage(sessionId, to, body, paymentLinks, footer) {
  return sendInteractiveMessage({
    sessionId,
    to,
    type: "payment",
    data: {
      body,
      footer: footer || "Secure payment link",
      buttons: paymentLinks.map((link) => ({
        text: link.text,
        url: link.url,
      })),
    },
  });
}

// Usage:
// await sendPaymentMessage(
//   'wa_123',
//   '918888888888',
//   'Complete your payment of ₹999',
//   [
//     { text: 'Pay via Razorpay', url: 'https://rzp.io/i/xxxxx' },
//     { text: 'Pay via UPI', url: 'upi://pay?pa=business@upi&am=999' }
//   ],
//   'Order #12345'
// );

/**
 * ============================================
 * WEBVIEW SENDER
 * ============================================
 */
async function sendWebViewMessage(sessionId, to, body, webviewURL, footer) {
  return sendInteractiveMessage({
    sessionId,
    to,
    type: "webview",
    data: {
      body,
      footer: footer || "Open in WhatsApp",
      buttons: [
        {
          text: "Open Now",
          url: webviewURL,
        },
      ],
    },
  });
}

// Usage:
// await sendWebViewMessage(
//   'wa_123',
//   '918888888888',
//   'View your dashboard',
//   'https://dashboard.suthartech.com/user?id=123',
//   'Your Account'
// );

/**
 * ============================================
 * GET SUPPORTED TYPES
 * ============================================
 */
async function getSupportedMessageTypes() {
  try {
    const response = await fetch("/api/messages/interactive/types");
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Failed to get message types:", error);
    throw error;
  }
}

/**
 * ============================================
 * USAGE IN REACT COMPONENT
 * ============================================
 */

/*
import { useState } from 'react';

function MessageSender() {
  const [sessionId, setSessionId] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSendQuickReply = async () => {
    setLoading(true);
    try {
      const result = await sendQuickReplyMessage(
        sessionId,
        to,
        'Choose an option',
        ['Option 1', 'Option 2', 'Option 3']
      );
      setResult(result);
    } catch (error) {
      setResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  return (
    <div>
      <input
        placeholder="Session ID"
        value={sessionId}
        onChange={(e) => setSessionId(e.target.value)}
      />
      <input
        placeholder="Phone Number"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <button onClick={handleSendQuickReply} disabled={loading}>
        {loading ? 'Sending...' : 'Send Quick Reply'}
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

export default MessageSender;
*/

/**
 * ============================================
 * VUE.JS EXAMPLE
 * ============================================
 */

/*
<template>
  <div>
    <input v-model="sessionId" placeholder="Session ID" />
    <input v-model="to" placeholder="Phone Number" />
    <button @click="sendQuickReply" :disabled="loading">
      {{ loading ? 'Sending...' : 'Send Quick Reply' }}
    </button>
    <pre v-if="result">{{ JSON.stringify(result, null, 2) }}</pre>
  </div>
</template>

<script>
export default {
  data() {
    return {
      sessionId: '',
      to: '',
      loading: false,
      result: null
    };
  },
  methods: {
    async sendQuickReply() {
      this.loading = true;
      try {
        this.result = await sendQuickReplyMessage(
          this.sessionId,
          this.to,
          'Choose option',
          ['Option 1', 'Option 2']
        );
      } catch (error) {
        this.result = { success: false, error: error.message };
      }
      this.loading = false;
    }
  }
};
</script>
*/

export {
  sendInteractiveMessage,
  sendQuickReplyMessage,
  sendURLButtonMessage,
  sendCallButtonMessage,
  sendListMessage,
  sendNativeFlowMessage,
  sendCarouselMessage,
  sendPaymentMessage,
  sendWebViewMessage,
  getSupportedMessageTypes,
};
