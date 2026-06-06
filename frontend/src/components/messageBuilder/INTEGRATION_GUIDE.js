/**
 * WHATSAPP MESSAGE BUILDER - INTEGRATION GUIDE
 *
 * This file documents how to integrate the MessageBuilder into your routing
 * and how to use it with your existing backend API.
 *
 * ============================================
 * STEP 1: ADD ROUTE TO YOUR APP.JSX
 * ============================================
 *
 * In your frontend/src/App.jsx, add this import:
 *
 *   import MessageBuilderPage from "./pages/MessageBuilderPage";
 *
 * Then add this route inside your Routes:
 *
 *   <Route
 *     path="/messages/builder"
 *     element={<MessageBuilderPage />}
 *   />
 *
 * ============================================
 * STEP 2: ADD NAVIGATION LINK
 * ============================================
 *
 * In your Navigation.jsx or Sidebar.jsx, add:
 *
 *   <Link to="/messages/builder" className="...">
 *     📨 Message Builder
 *   </Link>
 *
 * ============================================
 * STEP 3: VERIFY BACKEND API ENDPOINTS
 * ============================================
 *
 * These endpoints must exist on your backend:
 *
 * 1. POST /api/messages/interactive
 *    - Sends interactive message
 *    - Request: { sessionId, to, type, data }
 *    - Response: { success: boolean, message?: string, error?: string }
 *
 * 2. GET /api/sessions
 *    - Lists all WhatsApp sessions
 *    - Response: { data: [{ _id, phoneNumber, sessionId }, ...] }
 *
 * 3. POST /api/messages/templates (optional)
 *    - Saves message template
 *    - Request: { name, type, data }
 *    - Response: { success: boolean, _id?: string }
 *
 * 4. GET /api/messages/templates (optional)
 *    - Gets saved templates
 *    - Response: { data: [{ _id, name, type, data }, ...] }
 *
 * 5. DELETE /api/messages/templates/:id (optional)
 *    - Deletes template
 *    - Response: { success: boolean }
 *
 * ============================================
 * STEP 4: SUPPORTED MESSAGE TYPES
 * ============================================
 *
 * 1. quick_reply
 *    - Multiple clickable buttons
 *    - Max 3 buttons
 *    - Data: { body, footer?, buttons }
 *
 * 2. cta_url
 *    - Single URL button
 *    - Data: { title?, body, footer?, buttons }
 *
 * 3. cta_call
 *    - Single call button
 *    - Data: { title, body, footer?, buttons }
 *
 * 4. list
 *    - List with multiple options
 *    - Data: { title, body, footer?, buttonText, sections }
 *
 * 5. cta_copy
 *    - OTP copy button
 *    - Data: { body, footer?, buttons }
 *
 * ============================================
 * STEP 5: USAGE EXAMPLE IN COMPONENT
 * ============================================
 *
 * import { MessageBuilder } from "./components/messageBuilder";
 *
 * export default function MyComponent() {
 *   return <MessageBuilder />;
 * }
 *
 * ============================================
 * STEP 6: CUSTOM STYLING
 * ============================================
 *
 * All components use Tailwind CSS classes.
 * To customize colors, update these in the components:
 *
 * - Primary color: bg-blue-500, bg-blue-600
 * - Success color: bg-green-500
 * - Error color: bg-red-500
 * - Background: bg-gray-50, bg-white
 *
 * ============================================
 * API RESPONSE EXAMPLES
 * ============================================
 *
 * Success Response:
 * {
 *   "success": true,
 *   "message": "Message sent successfully"
 * }
 *
 * Error Response:
 * {
 *   "success": false,
 *   "error": "Invalid session ID"
 * }
 *
 * Sessions Response:
 * {
 *   "data": [
 *     {
 *       "_id": "123abc",
 *       "phoneNumber": "918307418627",
 *       "sessionId": "wa_1778474559339_c4cthqs"
 *     }
 *   ]
 * }
 *
 * ============================================
 * FEATURES INCLUDED
 * ============================================
 *
 * ✅ Type selector (5 types)
 * ✅ Dynamic form validation
 * ✅ Real-time WhatsApp preview
 * ✅ Session management
 * ✅ Template saving
 * ✅ Error handling
 * ✅ Loading states
 * ✅ Success/error notifications
 * ✅ Phone number validation
 * ✅ Button management (add/remove)
 *
 * ============================================
 * NEXT FEATURES (FUTURE)
 * ============================================
 *
 * 🚀 Drag-and-drop message builder
 * 🚀 Bulk messaging with CSV upload
 * 🚀 Message scheduling
 * 🚀 Template library UI
 * 🚀 Message analytics dashboard
 * 🚀 WhatsApp flow builder
 * 🚀 Auto-responder setup
 * 🚀 Contact list integration
 *
 */

// File structure created:
// frontend/src/
//   ├── components/messageBuilder/
//   │   ├── index.js                    (exports)
//   │   ├── MessageBuilder.jsx          (main component)
//   │   ├── QuickReplyForm.jsx          (form for quick reply)
//   │   ├── SavedTemplates.jsx          (template list)
//   │   ├── forms/
//   │   │   ├── CTAUrlForm.jsx          (URL button form)
//   │   │   ├── CTACallForm.jsx         (call button form)
//   │   │   ├── ListForm.jsx            (list message form)
//   │   │   └── CopyOTPForm.jsx         (OTP copy form)
//   │   └── preview/
//   │       └── WhatsAppPreview.jsx     (message preview)
//   ├── pages/
//   │   └── MessageBuilderPage.jsx      (page wrapper)
//   └── services/
//       └── messageBuilderApi.js        (API calls)

// Quick import usage:
// import { MessageBuilder, WhatsAppPreview } from "./components/messageBuilder";
