import {
  MessageCircle,
  Send,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  ArrowLeft,
  Clock,
  User,
  Trash2,
  Inbox,
  Loader2,
  Heart,
  MessageSquare,
  Share2,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { authFetch } from "../../services/authFetch";

// helper to map conversation from API to UI shape
function mapConversationApiToUi(c) {
  const participant = (c.participants && c.participants[0]) || {
    id: null,
    name: "Unknown",
  };
  return {
    id: c.id,
    name: participant.name || participant.id || "Unknown",
    handle: participant.name
      ? `@${participant.name.replace(/\s+/g, "").toLowerCase()}`
      : "@unknown",
    last: c.lastMessage?.message || "",
    time: c.updatedTime ? new Date(c.updatedTime).toLocaleString() : "",
    unread: c.unread || 0,
    isRequest: !!c.isRequest,
    avatarColor: "bg-slate-200",
    participants: c.participants || [],
    messages: [],
  };
}

export default function InstagramDM() {
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messageText, setMessageText] = useState("");

  const [conversations, setConversations] = useState([]);
  const [view, setView] = useState("inbox"); // inbox | requests | notifications
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const selectedChat =
    conversations.find((c) => c.id === selectedChatId) || null;
  const scrollRef = useRef(null);

  // scroll to bottom when chat changes or new messages appended
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // small timeout to allow rendering
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [selectedChatId, conversations]);

  // load conversations when view changes
  useEffect(() => {
    loadConversations(view);
  }, [view]);

  async function loadConversations(folder = "inbox") {
    try {
      const res = await authFetch(
        `/api/instagram/dms?folder=${folder}&limit=50`,
      );
      if (res && res.success) {
        const mapped = res.data.map(mapConversationApiToUi);
        setConversations(mapped);
        // auto-select first
        if (mapped.length && !selectedChatId) setSelectedChatId(mapped[0].id);
        setApiError(null);
      } else {
        console.error("Failed to load conversations", res);
        const userMessage =
          res?.error || "Failed to load Instagram conversations";
        // Detect common Graph permission error and provide actionable guidance
        if (userMessage.includes("Application does not have the capability")) {
          setApiError(
            "Instagram Messaging API not available for this app/token. Verify app permissions (instagram_manage_messages) and that the Instagram Business Account is connected to a Page with the correct Page access token.",
          );
        } else {
          setApiError(userMessage);
        }
        // fallback: try stored DB messages
        try {
          const fallback = await authFetch("/api/instagram/dms/stored");
          if (fallback && fallback.success) {
            const mapped = fallback.data.map((c) => ({
              id: c.conversationId,
              name: c.fromId || c.toId || "Unknown",
              handle: `@${(c.fromId || c.toId || "unknown").replace(/\s+/g, "").toLowerCase()}`,
              last: c.lastMessage || "",
              time: c.receivedAt ? new Date(c.receivedAt).toLocaleString() : "",
              unread: 0,
              isRequest: false,
              avatarColor: "bg-slate-200",
              participants: [{ id: c.fromId, name: c.fromId }],
              messages: [],
            }));
            setConversations(mapped);
            if (mapped.length && !selectedChatId)
              setSelectedChatId(mapped[0].id);
            setApiError(null);
          }
        } catch (e) {
          console.error("Stored DM fallback failed", e);
        }
      }
    } catch (err) {
      console.error("Error loading conversations", err);
      setApiError(err.message || String(err));
      // try DB fallback if live Graph fails
      try {
        const fallback = await authFetch("/api/instagram/dms/stored");
        if (fallback && fallback.success) {
          const mapped = fallback.data.map((c) => ({
            id: c.conversationId,
            name: c.fromId || c.toId || "Unknown",
            handle: `@${(c.fromId || c.toId || "unknown").replace(/\s+/g, "").toLowerCase()}`,
            last: c.lastMessage || "",
            time: c.receivedAt ? new Date(c.receivedAt).toLocaleString() : "",
            unread: 0,
            isRequest: false,
            avatarColor: "bg-slate-200",
            participants: [{ id: c.fromId, name: c.fromId }],
            messages: [],
          }));
          setConversations(mapped);
          if (mapped.length && !selectedChatId) setSelectedChatId(mapped[0].id);
          setApiError(null);
        }
      } catch (e) {
        console.error("Stored DM fallback failed", e);
      }
    }
  }

  // auto-load older messages when user scrolls to top
  const handleScroll = async (e) => {
    const el = e.target;
    if (!el) return;
    if (el.scrollTop < 80 && !loadingOlder && selectedChat) {
      await loadOlderMessages(selectedChat.id);
    }
  };

  async function loadOlderMessages(chatId) {
    setLoadingOlder(true);
    try {
      // fetch next page of messages for conversation
      const res = await authFetch(
        `/api/instagram/dms/${chatId}/messages?limit=25`,
      );
      if (res && res.success) {
        const msgs = res.data.map((m) => ({
          id: m.id,
          fromMe: false,
          text: m.text || "",
          timestamp: m.createdTime,
        }));
        setConversations((prev) =>
          prev.map((c) =>
            c.id !== chatId ? c : { ...c, messages: [...msgs, ...c.messages] },
          ),
        );
      } else {
        // try stored fallback
        try {
          const fb = await authFetch(
            `/api/instagram/dms/stored/${chatId}/messages?limit=50`,
          );
          if (fb && fb.success) {
            const msgs = fb.data.map((m) => ({
              id: m.id,
              fromMe: false,
              text: m.text || "",
              timestamp: m.receivedAt,
            }));
            setConversations((prev) =>
              prev.map((c) =>
                c.id !== chatId
                  ? c
                  : { ...c, messages: [...msgs.reverse(), ...c.messages] },
              ),
            );
          }
        } catch (e) {
          console.error("Stored messages fallback failed", e);
        }
      }
    } catch (err) {
      console.error("Error loading older messages", err);
    }
    setLoadingOlder(false);
  }

  function sendMessage() {
    if (!selectedChat || !messageText.trim()) return;
    const text = messageText.trim();
    setMessageText("");

    // Optimistic UI: append locally
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== selectedChat.id) return c;
        const nextId = (c.messages[c.messages.length - 1]?.id || 0) + 1;
        const newMsg = {
          id: nextId,
          fromMe: true,
          text,
          timestamp: new Date().toISOString(),
        };
        return {
          ...c,
          messages: [...c.messages, newMsg],
          last: text,
          unread: 0,
        };
      }),
    );

    // send to backend
    (async () => {
      try {
        // choose recipient id: pick first participant who isn't the business account
        const recipientId = selectedChat.participants?.[0]?.id;
        if (!recipientId)
          return console.error(
            "No recipientId found for conversation",
            selectedChat,
          );
        const res = await authFetch("/api/instagram/dms/send", {
          method: "POST",
          body: { recipientId, message: text },
        });
        if (!res || !res.success) console.error("Failed to send message", res);
      } catch (err) {
        console.error("Error sending message", err);
      }
    })();
  }

  // when a chat is selected, load its messages
  useEffect(() => {
    if (!selectedChatId) return;
    (async () => {
      try {
        const res = await authFetch(
          `/api/instagram/dms/${selectedChatId}/messages?limit=50`,
        );
        if (res && res.success) {
          const msgs = res.data.map((m) => ({
            id: m.id,
            fromMe: false,
            text: m.text || "",
            timestamp: m.createdTime,
          }));
          setConversations((prev) =>
            prev.map((c) =>
              c.id !== selectedChatId ? c : { ...c, messages: msgs, unread: 0 },
            ),
          );
        } else {
          // fallback to stored messages
          try {
            const fb = await authFetch(
              `/api/instagram/dms/stored/${selectedChatId}/messages?limit=200`,
            );
            if (fb && fb.success) {
              const msgs = fb.data.map((m) => ({
                id: m.id,
                fromMe: false,
                text: m.text || "",
                timestamp: m.receivedAt,
              }));
              setConversations((prev) =>
                prev.map((c) =>
                  c.id !== selectedChatId
                    ? c
                    : { ...c, messages: msgs.reverse(), unread: 0 },
                ),
              );
            }
          } catch (e) {
            console.error("Stored messages fallback failed", e);
          }
        }
      } catch (err) {
        console.error("Error loading conversation messages", err);
      }
    })();
  }, [selectedChatId]);

  async function runDebugToken() {
    try {
      const res = await authFetch("/api/instagram/debug/token");
      setDebugInfo(res || null);
    } catch (err) {
      setDebugInfo({ error: err.message || String(err) });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Direct Messages
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage and respond to Instagram DMs with quick actions and templates.
        </p>
      </div>

      {apiError && (
        <div className="rounded-md bg-amber-50 border border-amber-100 p-3 text-amber-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold">Instagram Messaging Error</div>
              <div className="text-sm mt-1 text-amber-800">{apiError}</div>
              <div className="text-xs text-amber-700 mt-2">
                Tip: ensure your Facebook App has{" "}
                <strong>instagram_manage_messages</strong> and Advanced access,
                the Page is linked to an Instagram Business Account, and tokens
                are valid.
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              <button
                onClick={runDebugToken}
                className="px-3 py-1 rounded bg-amber-600 text-white text-sm"
              >
                Run token debug
              </button>
              <button
                onClick={() => (window.location.href = "/instagram/connect")}
                className="px-3 py-1 rounded border border-amber-600 text-amber-600 text-sm"
              >
                Reconnect
              </button>
            </div>
          </div>
          {debugInfo && (
            <pre className="mt-3 text-xs text-amber-800 overflow-auto max-h-40">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div
        className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
        style={{ minHeight: 520 }}
      >
        <div className="flex h-full">
          {/* Conversations */}
          <aside className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-4">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
                  placeholder="Search conversations"
                />
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setView("inbox")}
                  className={`text-xs px-2 py-1 rounded-full ${view === "inbox" ? "bg-slate-100 dark:bg-slate-800 font-semibold" : "text-slate-500"}`}
                >
                  <MessageCircle size={14} className="inline mr-1" /> Inbox
                </button>
                <button
                  onClick={() => setView("requests")}
                  className={`text-xs px-2 py-1 rounded-full ${view === "requests" ? "bg-slate-100 dark:bg-slate-800 font-semibold" : "text-slate-500"}`}
                >
                  <Inbox size={14} className="inline mr-1" /> Requests
                </button>
                <div className="ml-auto text-xs text-slate-500">
                  {
                    conversations.filter((c) =>
                      view === "inbox" ? !c.isRequest : c.isRequest,
                    ).length
                  }{" "}
                  items
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations
                .filter((c) => (view === "inbox" ? !c.isRequest : c.isRequest))
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChatId(c.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-left ${
                      selectedChatId === c.id
                        ? "bg-slate-50 dark:bg-slate-800"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white ${c.avatarColor}`}
                    >
                      <User size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {c.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {c.handle}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400">{c.time}</div>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-sm text-slate-500 line-clamp-1">
                          {c.last}
                        </p>
                        <div className="flex items-center gap-2">
                          {c.isRequest && (
                            <div className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 font-semibold">
                              Request
                            </div>
                          )}
                          {c.unread > 0 && (
                            <div className="ml-2 rounded-full bg-pink-600 px-2 py-0.5 text-xs text-white font-semibold">
                              {c.unread}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

              {conversations.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <MessageCircle size={28} className="mx-auto mb-3" />
                  No conversations
                </div>
              )}
            </div>
          </aside>

          {/* Chat area */}
          <section className="flex-1 flex flex-col">
            {selectedChat ? (
              <>
                <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedChatId(null)}
                      className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <User size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedChat.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Active now · {selectedChat.handle}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Clock size={16} />
                    </button>
                    <button className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Trash2 size={16} />
                    </button>
                    <button className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </header>

                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  {loadingOlder && (
                    <div className="text-center text-xs text-slate-400">
                      <Loader2 className="mx-auto" /> Loading older messages...
                    </div>
                  )}
                  {selectedChat.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[70%] ${m.fromMe ? "ml-auto text-right" : ""}`}
                    >
                      {/* original / quoted message */}
                      {m.originalMessage && (
                        <div className="mb-2 rounded-xl border-l-2 border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800">
                          <div className="font-semibold text-xs text-slate-700">
                            {m.originalMessage.author}
                          </div>
                          <div className="text-xs text-slate-500">
                            {m.originalMessage.text}
                          </div>
                        </div>
                      )}
                      <div
                        className={`inline-block rounded-xl px-4 py-2 text-sm ${m.fromMe ? "bg-pink-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"}`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}

                  {/* example system message */}
                  <div className="text-center text-xs text-slate-400">
                    Conversation created • 3 days ago
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Paperclip size={18} />
                    </button>
                    <input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={
                        selectedChat?.isRequest
                          ? "Reply to request..."
                          : "Write a message..."
                      }
                      className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800"
                    />
                    <button className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Smile size={18} />
                    </button>
                    <button
                      onClick={() => sendMessage()}
                      className="ml-2 rounded-full bg-pink-600 px-4 py-2 text-white flex items-center gap-2"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <MessageCircle
                  size={48}
                  className="text-slate-300 dark:text-slate-600 mb-4"
                />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  No conversation selected
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">
                  Select a conversation from the left to view messages or start
                  a new one.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => setSelectedChatId(conversations[0]?.id)}
                    className="rounded-md bg-pink-600 px-4 py-2 text-white"
                  >
                    Start with Sana
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: "Auto-Responses",
            desc: "Set up automatic replies",
            icon: Send,
          },
          {
            title: "Message Templates",
            desc: "Create reusable messages",
            icon: MessageCircle,
          },
          {
            title: "Analytics",
            desc: "Track message performance",
            icon: Search,
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-dashed border-slate-300 p-6 text-center bg-slate-50 dark:bg-slate-800/40 opacity-80"
          >
            <div className="flex items-center justify-center mb-3 text-slate-700 dark:text-slate-300">
              <feature.icon size={20} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              {feature.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {feature.desc}
            </p>
            <div className="mt-4 inline-block rounded bg-amber-100 px-3 py-1 text-amber-800 text-xs">
              Coming Soon
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
