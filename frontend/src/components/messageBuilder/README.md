# 🚀 WhatsApp Message Builder - Complete System

## 📋 Overview

A **production-grade, no-code WhatsApp message builder** for your SaaS platform. Fully integrated with your existing backend API architecture.

**Supports 5 Interactive Message Types:**

- ✅ Quick Reply Buttons
- ✅ CTA URL (Link Button)
- ✅ CTA Call (Phone Button)
- ✅ List Message (Dropdown Options)
- ✅ OTP Copy Button

---

## 🏗️ Project Structure

```
frontend/src/
│
├── components/messageBuilder/
│   ├── MessageBuilder.jsx           ← Main component (CORE)
│   ├── QuickReplyForm.jsx           ← Quick reply form
│   ├── SavedTemplates.jsx           ← Template list
│   ├── INTEGRATION_GUIDE.js         ← Setup instructions
│   ├── index.js                     ← Component exports
│   │
│   ├── forms/                       ← Form components per type
│   │   ├── CTAUrlForm.jsx
│   │   ├── CTACallForm.jsx
│   │   ├── ListForm.jsx
│   │   └── CopyOTPForm.jsx
│   │
│   └── preview/
│       └── WhatsAppPreview.jsx      ← Live preview
│
├── pages/
│   └── MessageBuilderPage.jsx       ← Page wrapper
│
└── services/
    └── messageBuilderApi.js         ← API integration
```

---

## 🔧 Installation & Setup

### Step 1: Add Route to App.jsx

```javascript
// frontend/src/App.jsx
import MessageBuilderPage from "./pages/MessageBuilderPage";

// Inside your <Routes>:
<Route path="/messages/builder" element={<MessageBuilderPage />} />;
```

### Step 2: Add Navigation Link

Add to your Sidebar.jsx or Navigation.jsx:

```javascript
<Link to="/messages/builder" className="...">
  📨 Message Builder
</Link>
```

### Step 3: Verify Backend Endpoints

Your backend must have these endpoints:

```javascript
// 1. Send interactive message (REQUIRED)
POST /api/messages/interactive
Request:  { sessionId, to, type, data }
Response: { success: boolean, error?: string }

// 2. Get sessions (REQUIRED)
GET /api/sessions
Response: { data: [{ _id, phoneNumber, sessionId }] }

// 3. Save template (OPTIONAL)
POST /api/messages/templates
Request:  { name, type, data }
Response: { success: boolean, _id?: string }

// 4. Get templates (OPTIONAL)
GET /api/messages/templates
Response: { data: [{ _id, name, type, data }] }

// 5. Delete template (OPTIONAL)
DELETE /api/messages/templates/:id
Response: { success: boolean }
```

### Step 4: Test It!

1. Start your frontend: `npm run dev`
2. Navigate to `http://localhost:5173/messages/builder`
3. Fill out a form
4. Click "Send Message"

---

## 📱 Message Types Explained

### 1️⃣ Quick Reply

Multiple clickable buttons (max 3)

```json
{
  "type": "quick_reply",
  "data": {
    "body": "Choose option",
    "footer": "Powered by...",
    "buttons": [
      {
        "name": "quick_reply",
        "buttonParamsJson": "{\"display_text\":\"Yes\",\"id\":\"btn_yes\"}"
      }
    ]
  }
}
```

### 2️⃣ CTA URL

Single button with URL link

```json
{
  "type": "cta_url",
  "data": {
    "title": "Visit Us",
    "body": "Click to open",
    "buttons": [
      {
        "name": "cta_url",
        "buttonParamsJson": "{\"display_text\":\"Open\",\"url\":\"https://example.com\"}"
      }
    ]
  }
}
```

### 3️⃣ CTA Call

Single button with phone number

```json
{
  "type": "cta_call",
  "data": {
    "title": "Call Us",
    "body": "Tap to call",
    "buttons": [
      {
        "text": "Call Now",
        "phone": "918307418627"
      }
    ]
  }
}
```

### 4️⃣ List Message

Dropdown with multiple options

```json
{
  "type": "list",
  "data": {
    "title": "Services",
    "body": "Choose a service",
    "buttonText": "View Options",
    "sections": [
      {
        "title": "Main",
        "rows": [
          { "title": "Service 1", "rowId": "svc_1" },
          { "title": "Service 2", "rowId": "svc_2" }
        ]
      }
    ]
  }
}
```

### 5️⃣ OTP Copy

Button to copy OTP code

```json
{
  "type": "cta_copy",
  "data": {
    "body": "Your OTP",
    "buttons": [
      {
        "name": "cta_copy",
        "buttonParamsJson": "{\"display_text\":\"Copy\",\"copy_code\":\"482910\"}"
      }
    ]
  }
}
```

---

## 🎨 UI/UX Features

✅ **Type Selector** - 5 icon buttons to choose message type  
✅ **Dynamic Forms** - Form switches based on type selected  
✅ **Live Preview** - Real-time WhatsApp-style preview  
✅ **Session Picker** - Auto-loads your WhatsApp sessions  
✅ **Phone Input** - Easy phone number entry  
✅ **Button Management** - Add/remove buttons (with validation)  
✅ **Template Saving** - Save templates for reuse  
✅ **Error Handling** - Detailed error messages  
✅ **Loading States** - Visual feedback during send  
✅ **Success Alerts** - Confirmation after send

---

## 🔌 API Integration

### Using the Message Builder API Service

```javascript
import {
  sendInteractiveMessage,
  getWhatsAppSessions,
  saveMessageTemplate,
  getMessageTemplates,
  deleteMessageTemplate
} from "services/messageBuilderApi";

// Send a message
const response = await sendInteractiveMessage({
  sessionId: "wa_1778474559339_c4cthqs",
  to: "918307418627",
  type: "quick_reply",
  data: {
    body: "Hello!",
    buttons: [...]
  }
});

// Get sessions
const sessions = await getWhatsAppSessions();

// Save template
const template = await saveMessageTemplate({
  name: "Welcome Message",
  type: "quick_reply",
  data: {...}
});
```

---

## 🚀 Advanced Features (Roadmap)

Coming Soon:

- 🎨 Drag-and-drop message builder
- 📤 CSV bulk upload for contacts
- ⏰ Message scheduling
- 📊 Message analytics dashboard
- 🔄 Automated reply flows
- 📝 Template library with search
- 💾 Message history
- 🔔 Delivery status tracking

---

## 🛠️ Component API

### MessageBuilder Props

```javascript
<MessageBuilder />
// No props required! Uses context & localStorage
```

### Individual Form Components

```javascript
import { QuickReplyForm, CTAUrlForm } from "./components/messageBuilder";

<QuickReplyForm
  data={formData}
  onChange={(newData) => setFormData(newData)}
/>

<CTAUrlForm
  data={formData}
  onChange={(newData) => setFormData(newData)}
/>
```

### Preview Component

```javascript
import { WhatsAppPreview } from "./components/messageBuilder";

<WhatsAppPreview type="quick_reply" data={formData} />;
```

---

## 🎓 Usage Examples

### Example 1: Quick Reply

```javascript
// User selects "Quick Reply"
// Fills: Body = "Choose plan", Button = "View Plans"
// Sends to backend → WhatsApp receives interactive buttons
```

### Example 2: OTP Delivery

```javascript
// User selects "OTP Copy"
// Fills: Body = "Your OTP", Code = "482910"
// User receives message with copy button → taps → code copied to clipboard
```

### Example 3: List for Support

```javascript
// User selects "List Message"
// Fills: Title = "Support", Options = ["Billing", "Technical", "General"]
// User gets dropdown → selects option → backend receives selection
```

---

## 📊 Database Schema (Optional Templates)

```javascript
// Message Template Model
{
  _id: ObjectId,
  userId: ObjectId,
  name: String,        // "Welcome Message"
  type: String,        // "quick_reply"
  data: Object,        // Form data
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔐 Authentication

All API calls use **JWT Bearer token** from localStorage:

```javascript
// Automatically added to all authFetch calls
Authorization: Bearer {token}
```

---

## 🎯 Quick Troubleshooting

| Issue                | Solution                                         |
| -------------------- | ------------------------------------------------ |
| Sessions not loading | Check `/api/sessions` endpoint returns data      |
| Message send fails   | Verify sessionId & to phone number format        |
| Form not showing     | Check messageType state value                    |
| Preview not updating | Ensure onChange callback updates formData        |
| Template save fails  | Check backend `/api/messages/templates` endpoint |

---

## 📞 Support

For issues:

1. Check `INTEGRATION_GUIDE.js` in the component folder
2. Verify backend endpoints are responding
3. Check console for error messages
4. Inspect network tab for API calls

---

## 📄 License & Credits

Built for **WhatsApp AI SaaS Platform**  
Production-ready • Tailwind CSS • React 18

**Version:** 1.0.0  
**Last Updated:** May 2026

---

## 🎉 You're All Set!

Your Message Builder is ready to use. Just:

1. Add the route
2. Add the nav link
3. Test with a message

**Enjoy your new no-code message builder!** 🚀
