import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Lock,
  Send,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
  ChevronDown,
  MessageSquare,
  Smartphone,
  Wifi,
  Eye,
  EyeOff,
  X,
  Settings,
  KeyRound,
  AlertCircle,
  ShieldCheck,
  Unlock,
  MessagesSquare,
  File,
  Image as ImageIcon,
  FileText,
  ArrowLeft,
  RefreshCw,
  Users,
  User as UserIcon,
} from "lucide-react";
import { authFetch } from "../../services/authFetch";
import { resolveApiUrl } from "../../config/env";
import socketService from "../../services/socket";
import WavyCircleLoader, {
  InlineWavyLoader,
} from "../../components/WavyCircleLoader";

// ── Helpers ───────────────────────────────────────────────────────────────────
// Format a raw phone number string with + prefix
function formatPhone(raw) {
  if (!raw) return "";
  const s = String(raw).split("@")[0]; // strip any @domain
  return s.startsWith("+") ? s : `+${s}`;
}

// Best display name for a chat: saved name → formatted phone → JID extract → "Unknown Contact"
function chatDisplayName(chat) {
  if (!chat) return "Unknown Contact";
  if (chat.contactName) return chat.contactName;
  if (chat.phoneNumber) return formatPhone(chat.phoneNumber);
  const jid = chat.chatJid || "";
  if (jid.endsWith("@s.whatsapp.net")) return formatPhone(jid.split("@")[0]);
  return "Unknown Contact";
}

// ── Security: dummy data only — never replace with real data ──────────────────
const DUMMY_CHATS = [
  {
    id: "d1",
    name: "Manmohan Suthar",
    phone: "+91 83074 *****",
    lastMsg: "Thanks for the update! 👍",
    time: "10:42 AM",
    unread: 2,
    online: true,
    typing: false,
  },
  {
    id: "d2",
    name: "Sanjeev Suthar",
    phone: "+91 87654 *****",
    lastMsg: "Can we schedule a call tomorrow?",
    time: "9:15 AM",
    unread: 0,
    online: false,
    typing: false,
  },
  {
    id: "d3",
    name: "Suthar Tech",
    phone: "+91 76543 *****",
    lastMsg: "The order has been dispatched ✅",
    time: "Yesterday",
    unread: 5,
    online: true,
    typing: true,
  },
  {
    id: "d4",
    name: "Rahul Enterprises",
    phone: "+91 90000 *****",
    lastMsg: "Please send the invoice copy",
    time: "Yesterday",
    unread: 0,
    online: false,
    typing: false,
  },
  {
    id: "d5",
    name: "Demo Contact",
    phone: "+91 99887 *****",
    lastMsg: "Call me when you are free",
    time: "Mon",
    unread: 1,
    online: false,
    typing: false,
  },
];

const COMMON_EMOJI = [
  "😀",
  "😂",
  "😍",
  "🥰",
  "😎",
  "😭",
  "😅",
  "🤔",
  "👍",
  "👎",
  "❤️",
  "🔥",
  "✅",
  "🎉",
  "🙏",
  "😊",
  "😁",
  "🤣",
  "😘",
  "😤",
  "😡",
  "🥺",
  "😴",
  "🤯",
  "👋",
  "💪",
  "🎯",
  "⚡",
  "💯",
  "🚀",
  "✨",
  "💬",
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const AVATAR_BG = [
  "bg-violet-500",
  "bg-emerald-500",
  "bg-blue-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-pink-500",
];
const getBg = (str) => AVATAR_BG[(str?.charCodeAt(0) || 0) % AVATAR_BG.length];
const initials = (n) =>
  n
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??";
const fmtTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
};

const WHATSAPP_LIGHT_WALLPAPER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Cg fill='none' stroke='%23bfd3c6' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' opacity='0.55'%3E%3Cpath d='M10 12h8M14 8v8'/%3E%3Ccircle cx='31' cy='18' r='3'/%3E%3Cpath d='M52 11c4 0 6 2 6 5s-2 5-6 5h-1l-3 2 1-4c-1-1-2-2-2-3 0-3 2-5 5-5z'/%3E%3Cpath d='M75 10l6 6M81 10l-6 6'/%3E%3Cpath d='M15 40c4 0 6 2 6 5s-2 5-6 5h-1l-3 2 1-4c-1-1-2-2-2-3 0-3 2-5 5-5z'/%3E%3Cpath d='M36 40q4-4 8 0M36 49q4 4 8 0'/%3E%3Ccircle cx='63' cy='46' r='3.2'/%3E%3Cpath d='M77 40h8M81 36v8'/%3E%3Cpath d='M12 70l6 6M18 70l-6 6'/%3E%3Ccircle cx='34' cy='74' r='2.6'/%3E%3Cpath d='M50 68c4 0 6 2 6 5s-2 5-6 5h-1l-3 2 1-4c-1-1-2-2-2-3 0-3 2-5 5-5z'/%3E%3Cpath d='M72 72q3-3 6 0M72 79q3 3 6 0'/%3E%3C/g%3E%3C/svg%3E\")";

const WHATSAPP_DARK_WALLPAPER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Cg fill='none' stroke='%23355045' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' opacity='0.45'%3E%3Cpath d='M10 12h8M14 8v8'/%3E%3Ccircle cx='31' cy='18' r='3'/%3E%3Cpath d='M52 11c4 0 6 2 6 5s-2 5-6 5h-1l-3 2 1-4c-1-1-2-2-2-3 0-3 2-5 5-5z'/%3E%3Cpath d='M75 10l6 6M81 10l-6 6'/%3E%3Cpath d='M15 40c4 0 6 2 6 5s-2 5-6 5h-1l-3 2 1-4c-1-1-2-2-2-3 0-3 2-5 5-5z'/%3E%3Cpath d='M36 40q4-4 8 0M36 49q4 4 8 0'/%3E%3Ccircle cx='63' cy='46' r='3.2'/%3E%3Cpath d='M77 40h8M81 36v8'/%3E%3Cpath d='M12 70l6 6M18 70l-6 6'/%3E%3Ccircle cx='34' cy='74' r='2.6'/%3E%3Cpath d='M50 68c4 0 6 2 6 5s-2 5-6 5h-1l-3 2 1-4c-1-1-2-2-2-3 0-3 2-5 5-5z'/%3E%3Cpath d='M72 72q3-3 6 0M72 79q3 3 6 0'/%3E%3C/g%3E%3C/svg%3E\")";

const WHATSAPP_CHAT_BG_STYLE = {
  "--wa-light-wallpaper": WHATSAPP_LIGHT_WALLPAPER,
  "--wa-dark-wallpaper": WHATSAPP_DARK_WALLPAPER,
};

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, size = "md", online = false }) {
  const sz =
    size === "sm"
      ? "w-9 h-9 text-xs"
      : size === "lg"
        ? "w-12 h-12 text-sm"
        : "w-10 h-10 text-xs";
  return (
    <div className="relative flex-shrink-0">
      <div
        className={`${sz} ${getBg(name)} rounded-full flex items-center justify-center font-bold text-white select-none`}
      >
        {initials(name)}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white dark:border-slate-900 rounded-full" />
      )}
    </div>
  );
}

// ── Message status ─────────────────────────────────────────────────────────────
function MsgStatus({ status }) {
  if (status === "read")
    return <CheckCheck size={13} className="text-[#34b7f1]" />;
  if (status === "delivered")
    return <CheckCheck size={13} className="text-slate-400" />;
  return <Check size={13} className="text-slate-400" />;
}

// ── Session Switcher ───────────────────────────────────────────────────────────
// ── No Connected Session Screen ────────────────────────────────────────────────
function NoConnectedSessionScreen({ hasAnySession }) {
  return (
    <div className="flex-1 relative overflow-y-auto bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900">
      <div className="absolute top-[-60px] right-[-40px] w-80 h-80 bg-emerald-400/20 dark:bg-emerald-500/12 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-40px] left-[-60px] w-72 h-72 bg-teal-400/15 dark:bg-teal-500/10 rounded-full blur-[70px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-64 bg-emerald-300/10 dark:bg-emerald-600/8 rounded-full blur-[90px] pointer-events-none" />

      <div className="relative z-10 min-h-full flex flex-col items-center justify-center p-6 py-10">
        <div className="w-full max-w-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl shadow-emerald-500/10 border border-white/60 dark:border-slate-700/60 overflow-hidden">
          <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 pt-8 pb-7 text-center overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 70% 20%, white 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <div className="relative">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
                <Smartphone size={28} className="text-white" />
              </div>
              <p className="text-white font-bold text-lg">WhatsApp Inbox</p>
              <p className="text-emerald-100 text-xs mt-1.5">
                {hasAnySession
                  ? "Session disconnected"
                  : "No session connected"}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
              <Wifi size={24} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1.5">
                {hasAnySession
                  ? "Reconnect your session"
                  : "Connect WhatsApp first"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {hasAnySession
                  ? "Your WhatsApp session is offline or disconnected. Go to WhatsApp Sessions to reconnect and enable the chat view."
                  : "You haven't connected a WhatsApp account yet. Go to WhatsApp Sessions to scan a QR code and connect."}
              </p>
            </div>
            <a
              href="/sessions"
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-500/20"
            >
              <Smartphone size={15} />
              {hasAnySession ? "Reconnect Session" : "Connect a Session"}
            </a>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-slate-400 flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-emerald-500" />
          Sessions must be connected to access WhatsApp inbox
        </p>
      </div>
    </div>
  );
}

// ── Session Switcher (only shown when 2+ connected sessions) ───────────────────
function SessionSwitcher({ sessions, active, onSwitch }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const current = sessions.find((s) => s.sessionId === active) || sessions[0];
  const label =
    current?.phoneNumber ||
    current?.phone ||
    current?.name ||
    current?.sessionId ||
    "Session";

  // Single session: static display, no dropdown
  if (sessions.length <= 1) {
    return (
      <div className="px-3 pb-2">
        <div className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
            <Smartphone
              size={13}
              className="text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
              {label}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400">
                Connected
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative px-3 pb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-emerald-400/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all duration-200 group"
      >
        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
          <Smartphone
            size={13}
            className="text-emerald-600 dark:text-emerald-400"
          />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
            {label}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-[9px] text-slate-400 truncate">
              {sessions.length} sessions connected
            </span>
          </div>
        </div>
        <ChevronDown
          size={12}
          className={`text-slate-400 group-hover:text-emerald-500 transition-all flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 max-h-56 overflow-y-auto">
          <p className="text-[9px] font-bold text-slate-400 px-3 pt-2 pb-1 uppercase tracking-widest">
            Connected Sessions
          </p>
          {sessions.map((s) => (
            <button
              key={s.sessionId}
              onClick={() => {
                onSwitch(s.sessionId);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left ${s.sessionId === active ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${s.sessionId === active ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-slate-100 dark:bg-slate-800"}`}
              >
                <Wifi
                  size={11}
                  className={
                    s.sessionId === active
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                  {s.phoneNumber || s.phone || s.name || s.sessionId}
                </p>
                <p className="text-[9px] text-slate-400 truncate">
                  {s.sessionId}
                </p>
              </div>
              {s.sessionId === active && (
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check size={9} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dummy Chat Item (always shown, always blurred when locked) ─────────────────
function DummyChatItem({ chat }) {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3 text-left select-none pointer-events-none">
      <div style={{ filter: "blur(3px)" }}>
        <Avatar name={chat.name} online={chat.online} />
      </div>
      <div className="flex-1 min-w-0" style={{ filter: "blur(5px)" }}>
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
            {chat.name}
          </p>
          <span className="text-[10px] text-slate-400 flex-shrink-0">
            {chat.time}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs text-slate-500 truncate flex-1">
            {chat.lastMsg}
          </p>
          {chat.unread > 0 && (
            <span className="min-w-[18px] h-[18px] bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center flex-shrink-0 px-1">
              {chat.unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Real Chat Item ─────────────────────────────────────────────────────────────
function RealChatItem({ chat, active, onClick }) {
  const isGroup = chat.chatJid?.endsWith("@g.us");
  const name = chatDisplayName(chat);
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 text-left relative ${
        active
          ? "bg-emerald-50 dark:bg-emerald-900/20 border-r-2 border-emerald-500"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
      }`}
    >
      {isGroup ? (
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <Users size={18} className="text-indigo-500 dark:text-indigo-400" />
          </div>
        </div>
      ) : (
        <Avatar name={name} online={chat.isOnline} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="flex items-center gap-1 min-w-0">
            {isGroup && (
              <Users size={10} className="text-indigo-400 flex-shrink-0" />
            )}
            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
              {name}
            </p>
          </div>
          <span className="text-[10px] text-slate-400 flex-shrink-0">
            {fmtTime(chat.lastMessageTime)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs text-slate-500 truncate flex-1">
            {chat.isTyping ? (
              <span className="text-emerald-500 font-medium animate-pulse">
                typing…
              </span>
            ) : (
              chat.lastMessage || "Tap to open chat"
            )}
          </p>
          {chat.unreadCount > 0 && (
            <span className="min-w-[18px] h-[18px] bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center flex-shrink-0 px-1">
              {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Inbox Unlock Screen ────────────────────────────────────────────────────────
function InboxUnlockScreen({
  sessionLabel,
  activeSession,
  onUnlock,
  onChangePasscode,
}) {
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handle = async () => {
    if (!pwd || loading) return;
    setLoading(true);
    try {
      const res = await authFetch("/api/chats/passcode/verify", {
        method: "POST",
        body: { passcode: pwd, sessionId: activeSession },
      });
      if (res.success) {
        onUnlock();
      } else {
        throw new Error("Incorrect");
      }
    } catch {
      setError("Incorrect passcode. Try again.");
      setShake(true);
      setPwd("");
      setTimeout(() => {
        setError("");
        setShake(false);
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 relative overflow-y-auto bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900">
      <div className="absolute top-[-60px] right-[-40px] w-80 h-80 bg-emerald-400/20 dark:bg-emerald-500/12 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-40px] left-[-60px] w-72 h-72 bg-teal-400/15 dark:bg-teal-500/10 rounded-full blur-[70px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-64 bg-emerald-300/10 dark:bg-emerald-600/8 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-green-400/10 dark:bg-green-500/8 rounded-full blur-[50px] pointer-events-none" />

      <div className="relative z-10 min-h-full flex flex-col items-center justify-center p-6 py-10">
        <div className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Smartphone
            size={13}
            className="text-emerald-600 dark:text-emerald-400"
          />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
            {sessionLabel}
          </span>
        </div>

        <div
          className="w-full max-w-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl shadow-emerald-500/10 border border-white/60 dark:border-slate-700/60 overflow-hidden"
          style={shake ? { animation: "wiggle 0.3s ease-in-out" } : {}}
        >
          <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 pt-8 pb-7 text-center overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 70% 20%, white 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <div className="relative">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
                <Lock size={28} className="text-white" />
              </div>
              <p className="text-white font-bold text-lg">WhatsApp Inbox</p>
              <p className="text-emerald-100 text-xs mt-1.5">
                Session locked — enter passcode to access chats
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
                Lock Passcode
              </label>
              <div className="relative">
                <KeyRound
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  ref={inputRef}
                  type={show ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handle()}
                  placeholder="Enter passcode"
                  className={`w-full h-10 pl-9 pr-10 rounded-xl border text-sm bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    error
                      ? "border-red-400 focus:ring-red-300 bg-red-50 dark:bg-red-900/20"
                      : "border-slate-200 dark:border-slate-700 focus:ring-emerald-300 focus:border-emerald-400"
                  }`}
                />
                <button
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {show ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {error ? (
                <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} /> {error}
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Enter this session passcode
                </p>
              )}
            </div>

            <button
              onClick={handle}
              disabled={!pwd || loading}
              className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
            >
              <Unlock size={14} />
              {loading ? "Verifying…" : "Unlock All Chats"}
            </button>

            <button
              onClick={onChangePasscode}
              className="w-full text-[11px] text-slate-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1.5 pt-1"
            >
              <KeyRound size={10} /> Change lock passcode
            </button>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-slate-400 flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-emerald-500" />
          Passcode verified server-side · Private & secure
        </p>
      </div>
    </div>
  );
}

// ── Change Passcode Modal ──────────────────────────────────────────────────────
function ChangePasscodeModal({ onClose, activeSession }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!activeSession) {
      setError("Select a session first");
      return;
    }
    if (next.length < 4) {
      setError("New passcode must be at least 4 characters");
      return;
    }
    if (next !== confirm) {
      setError("Passcodes do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch("/api/chats/passcode/set", {
        method: "POST",
        body: {
          sessionId: activeSession,
          currentPasscode: current,
          newPasscode: next,
        },
      });
      if (res.success) {
        setDone(true);
        setTimeout(onClose, 1500);
      } else setError(res.error || "Failed to update passcode");
    } catch (e) {
      setError(e.message || "Incorrect current passcode");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <KeyRound size={13} className="text-emerald-600" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Change Lock Passcode
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={14} />
          </button>
        </div>
        {done ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center">
              <Check size={22} className="text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-emerald-600">
              Passcode updated!
            </p>
          </div>
        ) : (
          <>
            {[
              ["Current Passcode", current, setCurrent],
              ["New Passcode", next, setNext],
              ["Confirm New Passcode", confirm, setConfirm],
            ].map(([label, val, setter]) => (
              <div key={label}>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  {label}
                </label>
                <input
                  type="password"
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all"
                  placeholder="••••••••"
                />
              </div>
            ))}
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={11} />
                {error}
              </p>
            )}
            <button
              onClick={handle}
              disabled={loading}
              className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold transition-all"
            >
              {loading ? "Saving…" : "Save Passcode"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Emoji Picker ───────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [onClose]);
  return (
    <div
      ref={ref}
      className="absolute bottom-14 left-0 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-3 w-72"
    >
      <div className="grid grid-cols-8 gap-1">
        {COMMON_EMOJI.map((e) => (
          <button
            key={e}
            onClick={() => onSelect(e)}
            className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Media download card (image / video / document / audio) ────────────────────
function MediaCard({ msg, isMe }) {
  // states: "idle" | "loading" | "done" | "error"
  const [dlState, setDlState] = useState("idle");
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showImage, setShowImage] = useState(false);

  const rawUrl = msg.mediaUrl || msg.fileUrl || msg.url || null;
  const mediaUrl = rawUrl ? resolveApiUrl(rawUrl) : "";
  const isImage = msg.mediaType === "image";
  const isVideo = msg.mediaType === "video";
  const isAudio = msg.mediaType === "audio";
  const isDoc =
    msg.mediaType === "document" || (!isImage && !isVideo && !isAudio);

  const accentBase = isMe
    ? "bg-[#c8f5b0] dark:bg-[#024d3e]"
    : "bg-slate-100 dark:bg-slate-700";

  const iconColor = isAudio
    ? "text-blue-500"
    : isVideo
      ? "text-violet-500"
      : "text-emerald-600";
  const iconBg = isAudio
    ? "bg-blue-100 dark:bg-blue-900/40"
    : isVideo
      ? "bg-violet-100 dark:bg-violet-900/40"
      : "bg-emerald-100 dark:bg-emerald-900/40";
  const Icon = isAudio ? File : isVideo ? ImageIcon : FileText;
  const label =
    msg.mediaName || (isAudio ? "Audio" : isVideo ? "Video" : "Document");

  const handleImageClick = () => {
    if (dlState !== "idle") return;
    if (!mediaUrl) {
      setDlState("error");
      return;
    }
    setDlState("loading");

    const preload = new Image();
    preload.onload = () => {
      setTimeout(() => {
        setShowImage(true);
        setDlState("done");
        setImgLoaded(true);
      }, 1400);
    };
    preload.onerror = () => setDlState("error");
    preload.src = mediaUrl;
  };

  const handleFileDownload = async () => {
    if (dlState !== "idle") return;
    if (!mediaUrl) {
      setDlState("error");
      return;
    }

    setDlState("loading");
    setTimeout(() => {
      const a = document.createElement("a");
      a.href = mediaUrl;
      a.download = label;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDlState("done");
    }, 1000);
  };

  // Image card
  if (isImage) {
    return (
      <div className="mb-1.5 w-56 rounded-xl overflow-hidden relative group">
        {dlState === "idle" && (
          <button
            type="button"
            onClick={handleImageClick}
            className="w-full h-44 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 hover:brightness-95 hover:shadow-lg hover:shadow-emerald-500/20 transition-all rounded-xl"
          >
            <div className="relative w-16 h-16 rounded-xl bg-white/40 dark:bg-white/10 flex items-center justify-center shadow-inner">
              <ImageIcon
                size={28}
                className="text-slate-500 dark:text-slate-300"
              />
              <span className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 2v7m0 0L4.5 6.5M7 9l2.5-2.5M2 12h10"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Click to load photo
            </span>
          </button>
        )}
        {dlState === "loading" && (
          <div className="w-full h-44 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-xl">
            <div className="w-14 h-14 rounded-xl bg-white/40 dark:bg-white/10 flex items-center justify-center shadow-inner">
              <WavyCircleLoader size={48} color="blue" />
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Loading photo…
            </span>
          </div>
        )}
        {dlState === "done" && mediaUrl && showImage && (
          <div className="relative">
            <img
              src={mediaUrl}
              alt={msg.mediaName || "photo"}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              onError={() => setDlState("error")}
              className={`w-full max-h-72 object-cover rounded-xl transition-all duration-700 ${imgLoaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-sm scale-105"}`}
            />
            {!imgLoaded && (
              <div className="w-full h-44 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
            )}
            {imgLoaded && (
              <div
                className="pointer-events-none absolute inset-0 rounded-xl"
                style={{
                  boxShadow:
                    "inset 0 0 0 1px rgba(16,185,129,0.24), inset 0 0 28px rgba(16,185,129,0.22)",
                }}
              />
            )}
            {imgLoaded && (
              <span className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg wa-bounce-once">
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 7l4 4 6-6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </div>
        )}
        {dlState === "error" && (
          <div className="w-full h-28 rounded-xl flex items-center justify-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20">
            <AlertCircle size={16} />
            <span className="text-xs">Unavailable</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`mb-1.5 flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/50 dark:border-slate-600/40 ${accentBase} min-w-[180px] max-w-[220px]`}
    >
      <button
        type="button"
        onClick={handleFileDownload}
        className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${iconBg} transition-all active:scale-90 hover:shadow-md`}
      >
        {dlState === "idle" && (
          <div className="relative">
            <Icon size={18} className={iconColor} />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 2v7m0 0L4.5 6.5M7 9l2.5-2.5M2 12h10"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        )}
        {dlState === "loading" && (
          <div className="w-8 h-8 flex items-center justify-center">
            <InlineWavyLoader
              size={20}
              color={
                color === "white"
                  ? "white"
                  : color === "violet"
                    ? "violet"
                    : color === "blue"
                      ? "blue"
                      : "slate"
              }
            />
          </div>
        )}
        {dlState === "done" && (
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 7l4 4 6-6"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </button>
      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 truncate">
          {label}
        </p>
        <p className="text-[10px] text-slate-400 capitalize">
          {dlState === "loading"
            ? "Downloading..."
            : dlState === "done"
              ? "Downloaded"
              : msg.mediaType || "file"}
        </p>
      </div>
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isMe = msg.direction === "out";
  const hasMedia = !!msg.mediaType;

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1.5`}>
      <div
        className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl shadow-sm ${isMe ? "bg-[#d1f7bf] dark:bg-[#005c4b] rounded-tr-none" : "bg-white dark:bg-slate-800 rounded-tl-none"}`}
      >
        {hasMedia && <MediaCard msg={msg} isMe={isMe} />}
        {msg.text && (
          <p className="text-[13px] text-slate-800 dark:text-slate-100 leading-relaxed break-words whitespace-pre-wrap">
            {msg.text}
          </p>
        )}
        <div
          className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}
        >
          <span className="text-[10px] text-slate-400">
            {fmtTime(msg.timestamp)}
          </span>
          {isMe && <MsgStatus status={msg.status} />}
        </div>
      </div>
    </div>
  );
}

// ── Chat empty state ───────────────────────────────────────────────────────────
function ChatEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 select-none">
      <div className="w-20 h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center">
        <MessagesSquare
          size={36}
          className="text-emerald-400"
          strokeWidth={1.5}
        />
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-slate-700 dark:text-slate-200">
          Select a conversation
        </p>
        <p className="text-sm text-slate-400 mt-1.5 max-w-xs leading-relaxed">
          Choose a chat from the sidebar to view messages
        </p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function WhatsAppChats() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [hasAnySession, setHasAnySession] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showChangePasscode, setShowChangePasscode] = useState(false);

  // Real chat state (only populated after unlock)
  const [realChats, setRealChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Compose state
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const activeChatRef = useRef(null);
  activeChatRef.current = activeChat;

  // Load real sessions
  useEffect(() => {
    authFetch("/api/sessions")
      .then((d) => {
        const all = d.data || [];
        const connected = all.filter(
          (s) => s.status === "connected" && s.chatViewEnabled === true,
        );
        setHasAnySession(connected.length > 0);
        setSessions(connected);
        if (connected.length > 0) setActiveSession(connected[0].sessionId);
      })
      .catch(() => {})
      .finally(() => setSessionsLoaded(true));
  }, []);

  // Load real chats from DB
  const loadChats = useCallback(async (sessionId, silent = false) => {
    if (!sessionId) return;
    if (!silent) setLoadingChats(true);
    try {
      const res = await authFetch(`/api/chats/${sessionId}/list`);
      setRealChats(res.chats || []);
      setSyncCount(res.count || 0);
    } catch {
      setRealChats([]);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  // Socket.io — join session room + listen for real-time events
  useEffect(() => {
    if (!isUnlocked || !activeSession) return;

    socketService.connect();
    socketService.joinSession(activeSession);

    // chat:synced fires when chats.upsert or history append completes
    socketService.on("chat:synced", () => {
      setSyncing(false);
      loadChats(activeSession, true);
    });

    // chat:message fires for every new real-time message
    socketService.on("chat:message", (data) => {
      if (data.sessionId !== activeSession) return;

      // Update chat list
      setRealChats((prev) => {
        const existing = prev.find((c) => c.chatJid === data.chatJid);
        const updated = {
          ...(existing || {}),
          chatJid: data.chatJid,
          phoneNumber: data.phoneNumber,
          contactName: data.contactName || data.phoneNumber,
          lastMessage:
            data.text || (data.mediaType ? `[${data.mediaType}]` : ""),
          lastMessageTime: data.timestamp,
          unreadCount:
            activeChatRef.current?.chatJid === data.chatJid
              ? 0
              : (existing?.unreadCount || 0) +
                (data.direction === "in" ? 1 : 0),
        };
        if (existing)
          return [updated, ...prev.filter((c) => c.chatJid !== data.chatJid)];
        return [updated, ...prev];
      });

      // Append to open chat messages
      if (activeChatRef.current?.chatJid === data.chatJid) {
        setMessages((prev) => [
          ...prev,
          {
            _id: data.messageId,
            messageId: data.messageId,
            text: data.text,
            direction: data.direction,
            mediaType: data.mediaType,
            timestamp: data.timestamp,
            status: "read",
          },
        ]);
      }
    });

    setSyncing(true);

    // Safety timeout — stop "syncing" indicator after 8 s regardless
    const syncTimeout = setTimeout(() => setSyncing(false), 8000);

    return () => {
      clearTimeout(syncTimeout);
      socketService.off("chat:synced");
      socketService.off("chat:message");
    };
  }, [isUnlocked, activeSession, loadChats]);

  // Initial chat list load after unlock / session switch
  useEffect(() => {
    if (isUnlocked) loadChats(activeSession);
  }, [isUnlocked, activeSession, loadChats]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChat || !isUnlocked) return;
    const jid = encodeURIComponent(activeChat.chatJid);
    setLoadingMsgs(true);
    authFetch(`/api/chats/${activeSession}/messages/${jid}`)
      .then((res) => setMessages(res.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
  }, [activeChat, activeSession, isUnlocked]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSwitchSession = (sessionId) => {
    setActiveSession(sessionId);
    setIsUnlocked(false);
    setActiveChat(null);
    setMessages([]);
    setRealChats([]);
    setSyncCount(0);
  };

  const handleUnlock = () => setIsUnlocked(true);

  const handleForceSync = async () => {
    if (!activeSession) return;
    setSyncing(true);
    try {
      await authFetch(`/api/chats/${activeSession}/force-sync`, {
        method: "POST",
      });
      // chat:synced socket event will fire and stop the spinner + reload chats
      // Safety fallback timeout already set in socket effect
    } catch {
      setSyncing(false);
    }
  };

  const handleChatClick = (chat) => {
    setActiveChat(chat);
    // Mark as read locally
    setRealChats((prev) =>
      prev.map((c) =>
        c.chatJid === chat.chatJid ? { ...c, unreadCount: 0 } : c,
      ),
    );
    // Mark as read on server
    authFetch(
      `/api/chats/${activeSession}/read/${encodeURIComponent(chat.chatJid)}`,
      { method: "POST" },
    ).catch(() => {});
  };

  const handleSend = async () => {
    if ((!msgInput.trim() && !pendingFile) || !activeChat || sending) return;
    setSending(true);
    try {
      const formData = new FormData();
      // If chatJid is a WhatsApp internal LID (@lid), use phoneNumber@s.whatsapp.net instead
      const sendJid =
        activeChat.chatJid?.endsWith("@lid") && activeChat.phoneNumber
          ? `${activeChat.phoneNumber.replace(/\D/g, "")}@s.whatsapp.net`
          : activeChat.chatJid;
      formData.append("chatJid", sendJid);
      if (msgInput.trim()) formData.append("message", msgInput.trim());
      if (pendingFile) formData.append("file", pendingFile);

      const token = localStorage.getItem("token");
      const res = await fetch(`/api/chats/${activeSession}/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        setRealChats((prev) =>
          prev.map((c) =>
            c.chatJid === activeChat.chatJid
              ? {
                  ...c,
                  lastMessage: data.message.text,
                  lastMessageTime: data.message.timestamp,
                }
              : c,
          ),
        );
      }
    } catch {
      /* silently fail — message already logged by backend */
    } finally {
      setMsgInput("");
      setPendingFile(null);
      setSending(false);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMsgInput((v) => v + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setPendingFile(f);
    e.target.value = "";
  };

  const activeSessionObj = activeSession
    ? sessions.find((s) => s.sessionId === activeSession) || sessions[0]
    : sessions[0];
  const sessionLabel =
    activeSessionObj?.phoneNumber ||
    activeSessionObj?.phone ||
    activeSessionObj?.name ||
    activeSessionObj?.sessionId ||
    "Session";
  const filteredChats = realChats.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.contactName || "").toLowerCase().includes(q) ||
      (c.phoneNumber || "").includes(q)
    );
  });

  return (
    <div className="-mx-6 -mt-6 -mb-6 flex h-[calc(100vh-60px)] overflow-hidden bg-slate-100 dark:bg-slate-950">
      <style>{`
        @keyframes wiggle { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        @keyframes waBounceOnce {
          0% { transform: scale(0.7) translateY(4px); opacity: 0; }
          55% { transform: scale(1.12) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .wa-bounce-once { animation: waBounceOnce 420ms ease-out both; }
        .wa-chat-wallpaper {
          background-color: #efeae2;
          background-image: var(--wa-light-wallpaper);
          background-repeat: repeat;
          background-size: 96px 96px;
          background-position: center;
        }
        .dark .wa-chat-wallpaper {
          background-color: #0b141a;
          background-image: var(--wa-dark-wallpaper);
        }
      `}</style>

      {/* ── LEFT CHAT SIDEBAR ──────────────────────────────────────────────── */}
      <div
        className="flex flex-col w-[320px] min-w-[280px] flex-shrink-0 relative bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800"
        style={{
          boxShadow:
            "4px 0 24px rgba(16,185,129,0.08), 2px 0 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
                <MessageSquare
                  size={12}
                  className="text-white"
                  strokeWidth={2.5}
                />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                Chats
              </p>
              {isUnlocked && realChats.some((c) => c.unreadCount > 0) && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-[9px] text-white font-bold">
                  {realChats.reduce((s, c) => s + (c.unreadCount || 0), 0)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {isUnlocked && (
                <button
                  onClick={() => {
                    setIsUnlocked(false);
                    setActiveChat(null);
                    setMessages([]);
                  }}
                  title="Lock"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  <Lock size={13} />
                </button>
              )}
              <button
                onClick={() => setShowChangePasscode(true)}
                disabled={!activeSession}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <KeyRound size={13} />
              </button>
              <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Settings size={13} />
              </button>
            </div>
          </div>

          {sessions.length > 0 && (
            <SessionSwitcher
              sessions={sessions}
              active={activeSession}
              onSwitch={handleSwitchSession}
            />
          )}

          <div className="relative pb-1">
            <Search
              size={12}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="w-full pl-8 pr-3 h-9 bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-emerald-400/50 rounded-xl text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 transition-all"
              placeholder="Search chats…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Sync status bar */}
          {isUnlocked && activeSession && (
            <div className="pb-2">
              {syncing ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <InlineWavyLoader size={12} color="emerald" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Syncing WhatsApp…
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] text-slate-400">
                    {syncCount > 0
                      ? `${syncCount} conversations`
                      : "No chats synced yet"}
                  </span>
                  <button
                    onClick={handleForceSync}
                    className="text-[10px] text-emerald-500 hover:text-emerald-600 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw size={9} /> Sync chats
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat list */}
        <div className="flex-1 relative overflow-hidden">
          <div className="h-full overflow-y-auto">
            {!isUnlocked ? (
              DUMMY_CHATS.map((c) => <DummyChatItem key={c.id} chat={c} />)
            ) : loadingChats ? (
              <div className="flex flex-col items-center justify-center h-24 gap-2">
                <WavyCircleLoader size="md" color="emerald" />
                <p className="text-xs text-slate-400">Loading chats…</p>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
                {syncing ? (
                  <>
                    <WavyCircleLoader size="lg" color="emerald" />
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Syncing WhatsApp…
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Loading your chats from WhatsApp
                    </p>
                  </>
                ) : (
                  <>
                    <MessageSquare
                      size={28}
                      className="text-slate-300 dark:text-slate-600"
                    />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      No chats yet
                    </p>
                    <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                      Click "Sync chats" to load your
                      <br />
                      WhatsApp conversations
                    </p>
                    <button
                      onClick={handleForceSync}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw size={11} /> Sync WhatsApp Chats
                    </button>
                  </>
                )}
              </div>
            ) : (
              filteredChats.map((c) => (
                <RealChatItem
                  key={c.chatJid}
                  chat={c}
                  active={activeChat?.chatJid === c.chatJid}
                  onClick={() => handleChatClick(c)}
                />
              ))
            )}
          </div>

          {/* Lock overlay with fade (always on top of dummy chats) */}
          {!isUnlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 pointer-events-none">
              <div
                className="absolute inset-0 dark:hidden"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.82) 65%, rgba(255,255,255,1) 85%)",
                }}
              />
              <div
                className="absolute inset-0 hidden dark:block"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(15,23,42,0) 0%, rgba(15,23,42,0) 40%, rgba(15,23,42,0.82) 65%, rgba(15,23,42,1) 85%)",
                }}
              />
              <div className="relative z-10 flex flex-col items-center gap-2 px-6 text-center mb-2">
                <div
                  className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-center"
                  style={{
                    boxShadow:
                      "0 0 0 4px rgba(16,185,129,0.10), 0 4px 20px rgba(16,185,129,0.18)",
                  }}
                >
                  <Lock size={17} className="text-emerald-500" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Session Protected
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                  Unlock on the right to
                  <br />
                  access your conversations
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent pointer-events-none" />
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!sessionsLoaded ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <WavyCircleLoader size="lg" color="emerald" />
            <p className="text-sm text-slate-400">Loading WhatsApp sessions…</p>
          </div>
        ) : sessions.length === 0 ? (
          <NoConnectedSessionScreen hasAnySession={hasAnySession} />
        ) : !isUnlocked ? (
          <InboxUnlockScreen
            sessionLabel={sessionLabel}
            activeSession={activeSession}
            onUnlock={handleUnlock}
            onChangePasscode={() => setShowChangePasscode(true)}
          />
        ) : activeChat ? (
          <>
            {/* Chat header — minimal: avatar, name, status only */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm flex-shrink-0">
              <button
                onClick={() => setActiveChat(null)}
                className="md:hidden w-8 h-8 flex items-center justify-center text-slate-500"
              >
                <ArrowLeft size={18} />
              </button>
              <Avatar
                name={chatDisplayName(activeChat)}
                size="md"
                online={activeChat.isOnline}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                  {chatDisplayName(activeChat)}
                </p>
                <p className="text-[11px] truncate">
                  {activeChat.isTyping ? (
                    <span className="text-emerald-500 font-medium animate-pulse">
                      typing…
                    </span>
                  ) : activeChat.isOnline ? (
                    <span className="text-emerald-500">online</span>
                  ) : (
                    <span className="text-slate-400">
                      {activeChat.phoneNumber
                        ? formatPhone(activeChat.phoneNumber)
                        : ""}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 wa-chat-wallpaper"
              style={WHATSAPP_CHAT_BG_STYLE}
            >
              {loadingMsgs ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <WavyCircleLoader size="lg" color="emerald" />
                  <p className="text-xs text-slate-500">Loading messages…</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 py-12">
                  <MessageSquare
                    size={32}
                    className="text-slate-400"
                    strokeWidth={1}
                  />
                  <p className="text-sm text-slate-500">
                    No messages yet. Say hello! 👋
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <Bubble key={msg._id || msg.messageId} msg={msg} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose area */}
            <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 relative">
              {/* File preview */}
              {pendingFile && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40">
                  {pendingFile.type.startsWith("image/") ? (
                    <ImageIcon
                      size={14}
                      className="text-emerald-600 flex-shrink-0"
                    />
                  ) : (
                    <FileText
                      size={14}
                      className="text-emerald-600 flex-shrink-0"
                    />
                  )}
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 truncate flex-1">
                    {pendingFile.name}
                  </span>
                  <button
                    onClick={() => setPendingFile(null)}
                    className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Emoji picker */}
              {showEmoji && (
                <EmojiPicker
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmoji(false)}
                />
              )}

              <div className="flex items-end gap-2">
                {/* Emoji button */}
                <button
                  onClick={() => setShowEmoji((v) => !v)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                >
                  <Smile size={20} />
                </button>

                {/* Attachment button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                >
                  <Paperclip size={20} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Text input */}
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2.5 min-h-[40px] flex items-center">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none max-h-28 overflow-auto leading-relaxed"
                    placeholder="Type a message…"
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                </div>

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={(!msgInput.trim() && !pendingFile) || sending}
                  className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 flex items-center justify-center text-white transition-all flex-shrink-0 shadow-md shadow-emerald-500/30"
                >
                  {sending ? (
                    <InlineWavyLoader size={18} color="white" />
                  ) : (
                    <Send size={17} />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div
            className="flex-1 flex items-center justify-center wa-chat-wallpaper"
            style={WHATSAPP_CHAT_BG_STYLE}
          >
            <ChatEmptyState />
          </div>
        )}
      </div>

      {showChangePasscode && (
        <ChangePasscodeModal
          onClose={() => setShowChangePasscode(false)}
          activeSession={activeSession}
        />
      )}
    </div>
  );
}
