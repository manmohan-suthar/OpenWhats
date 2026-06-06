/**
 * MESSAGE BUILDER - QUICK TESTING & DEBUGGING GUIDE
 *
 * Use this to verify everything works correctly
 */

// ============================================
// STEP 1: Test API Service Imports
// ============================================

// In browser console (F12), run:
console.log("Testing message builder API...");

// This should work without errors:
import { sendInteractiveMessage } from "./src/services/messageBuilderApi.js";

// ============================================
// STEP 2: Check Backend Endpoints
// ============================================

// Test your backend is responding:

// 1. GET /api/sessions
fetch("/api/sessions", {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
})
  .then((r) => r.json())
  .then((d) => console.log("Sessions:", d));

// Expected output:
// {
//   "data": [
//     { "_id": "123", "phoneNumber": "918307418627", "sessionId": "wa_..." }
//   ]
// }

// 2. POST /api/messages/interactive (test call)
fetch("/api/messages/interactive", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
  body: JSON.stringify({
    sessionId: "wa_1778474559339_c4cthqs",
    to: "918307418627",
    type: "quick_reply",
    data: {
      body: "Test message",
      footer: "Test",
      buttons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "Test Button",
            id: "test_btn",
          }),
        },
      ],
    },
  }),
})
  .then((r) => r.json())
  .then((d) => console.log("Send Response:", d));

// ============================================
// STEP 3: Component Import Test
// ============================================

// In your page/component:
import { MessageBuilder } from "@/components/messageBuilder";

// This should load without errors:
<MessageBuilder />;

// ============================================
// STEP 4: Form Data Validation
// ============================================

// Test Quick Reply form data structure:
const quickReplyData = {
  body: "Choose an option",
  footer: "Powered by Suthar Tech",
  buttons: [
    {
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: "Option 1",
        id: "opt_1",
      }),
    },
    {
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: "Option 2",
        id: "opt_2",
      }),
    },
  ],
};

// Should produce valid payload:
const payload = {
  sessionId: "wa_1778474559339_c4cthqs",
  to: "918307418627",
  type: "quick_reply",
  data: quickReplyData,
};

// ============================================
// STEP 5: Common Errors & Solutions
// ============================================

// ERROR: "Missing required fields"
// FIX: Ensure sessionId, to, type are all provided

// ERROR: "Invalid message type"
// FIX: Use one of: quick_reply, cta_url, cta_call, list, cta_copy

// ERROR: "Cannot fetch sessions"
// FIX: Check /api/sessions endpoint exists & returns data

// ERROR: "Component not rendering"
// FIX: Check route is added to App.jsx

// ERROR: "Token undefined"
// FIX: Ensure user is logged in (token in localStorage)

// ============================================
// STEP 6: Debug Checklist
// ============================================

const debugChecklist = [
  // Backend
  "✓ Backend server running (port 5000 or configured)",
  "✓ POST /api/messages/interactive endpoint exists",
  "✓ GET /api/sessions endpoint exists",
  "✓ JWT token working (Authorization header)",

  // Frontend
  "✓ Route added to App.jsx",
  "✓ Nav link added to Sidebar/Navigation",
  "✓ All component files created",
  "✓ messageBuilderApi.js imported correctly",
  "✓ AuthContext/Token available",

  // Data
  "✓ Session ID format: wa_XXXXX_YYYYY",
  "✓ Phone number format: 918307418627 (no +)",
  "✓ Message type is valid",
  "✓ Form data matches expected structure",
];

// ============================================
// STEP 7: Performance Tips
// ============================================

// The component is optimized for:
// ✓ Real-time preview updates
// ✓ Form switching (no re-fetch)
// ✓ Session caching (load once)
// ✓ Minimal re-renders
// ✓ Lazy loading of forms

// ============================================
// STEP 8: Network Tab Inspection
// ============================================

// Open DevTools → Network tab
// You should see:

// 1. GET /api/sessions
//    Status: 200
//    Response: { data: [...] }

// 2. POST /api/messages/interactive
//    Status: 200 (success) or 400+ (error)
//    Response: { success: true/false }

// ============================================
// STEP 9: Console Logging
// ============================================

// MessageBuilder will log:
// - Form data changes
// - API requests
// - API responses
// - Errors

// Disable logging in production by removing console.log calls

// ============================================
// STEP 10: Production Checklist
// ============================================

const productionChecklist = [
  "✓ All console.log removed (optional)",
  "✓ Error messages user-friendly",
  "✓ Loading states working",
  "✓ Mobile responsive (tested on phone)",
  "✓ Accessibility (keyboard navigation)",
  "✓ Environment variables configured",
  "✓ Authentication verified",
  "✓ Rate limiting configured (backend)",
  "✓ Error boundaries added",
  "✓ Performance optimized",
];

// ============================================
// Need help? Check these files:
// ============================================

// INTEGRATION_GUIDE.js - Full setup guide
// README.md - Feature overview & API docs
// ROUTING_EXAMPLE.js - App.jsx integration
// src/services/messageBuilderApi.js - API calls
// src/components/messageBuilder/ - All components
