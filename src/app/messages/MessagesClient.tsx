"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  User,
  Users,
  Clock,
  Check,
  CheckCheck,
  ArrowLeft,
  RefreshCw,
  Heart,
  Shield,
  Search,
} from "lucide-react";
import { PageHeader, EmptyState, SkeletonDetail } from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { usePatientContext } from "@/context/PatientContext";

interface MessageItem {
  id: string;
  senderType: "ADMIN" | "CARETAKER" | "FAMILY" | string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
}

interface ConversationData {
  id: string;
  patientId: string;
  patient: {
    id: string;
    name: string;
    avatarColor: string;
    caregiver?: { id: string; name: string } | null;
    familyMembers?: { id: string; name: string; relationship: string; isPrimaryContact: boolean }[];
  };
  messages: MessageItem[];
}

interface ConversationSummary {
  id: string;
  patientId: string;
  patient: {
    id: string;
    name: string;
    avatarColor: string;
  };
  latestMessage?: {
    body: string;
    createdAt: string;
    senderType: string;
  } | null;
  unreadCount: number;
}

function MessagesContent() {
  const { user } = useAuth();
  const { patients } = usePatientContext();
  const searchParams = useSearchParams();
  const queryPatientId = searchParams.get("patientId");

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activePatientId, setActivePatientId] = useState<string>("");
  const [activeConversation, setActiveConversation] = useState<ConversationData | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch list of conversations
  const fetchConversationsList = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Fetch single conversation details
  const fetchActiveConversation = useCallback(
    async (patientId: string) => {
      try {
        setLoadingChat(true);
        const res = await fetch(`/api/messages?patientId=${patientId}`);
        if (res.ok) {
          const data = await res.json();
          setActiveConversation(data.conversation);

          // Mark messages as read
          if (data.conversation?.id) {
            await fetch("/api/messages", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversationId: data.conversation.id }),
            });
            // Update unread count locally in list
            setConversations((prev) =>
              prev.map((c) => (c.patientId === patientId ? { ...c, unreadCount: 0 } : c))
            );
          }
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
      } finally {
        setLoadingChat(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchConversationsList();
  }, [fetchConversationsList]);

  // Set initial active patient
  useEffect(() => {
    if (queryPatientId) {
      setActivePatientId(queryPatientId);
    } else if (patients.length > 0 && !activePatientId) {
      setActivePatientId(patients[0].id);
    }
  }, [queryPatientId, patients, activePatientId]);

  useEffect(() => {
    if (activePatientId) {
      fetchActiveConversation(activePatientId);
    }
  }, [activePatientId, fetchActiveConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activePatientId || sending) return;

    setSending(true);
    const textToSend = inputText.trim();
    setInputText("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: activePatientId,
          body: textToSend,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveConversation((prev) =>
          prev ? { ...prev, messages: [...prev.messages, data.message] } : prev
        );
        fetchConversationsList();
      } else {
        alert("Failed to send message");
        setInputText(textToSend);
      }
    } catch (err) {
      console.error("Send error:", err);
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  if (loadingList && patients.length === 0) {
    return <SkeletonDetail />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Care Circle Secure Messaging"
        description="Private coordination channel between assigned caregivers, verified family members, and clinical supervisors."
      />

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Left: Patient Circle Channels List */}
        <div className="md:col-span-1 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-600" />
              <span>Patient Circles ({patients.length})</span>
            </h3>
            <button
              onClick={() => {
                fetchConversationsList();
                if (activePatientId) fetchActiveConversation(activePatientId);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {patients.map((p) => {
              const convSummary = conversations.find((c) => c.patientId === p.id);
              const isSelected = activePatientId === p.id;
              const unread = convSummary?.unreadCount || 0;

              return (
                <button
                  key={p.id}
                  onClick={() => setActivePatientId(p.id)}
                  className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${
                    isSelected
                      ? "bg-teal-50/70 dark:bg-teal-950/30 border-l-4 border-teal-600"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-2xl text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs"
                    style={{ backgroundColor: p.avatarColor || "#0D9488" }}
                  >
                    {p.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {p.name}
                      </span>
                      {convSummary?.latestMessage && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(convSummary.latestMessage.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {convSummary?.latestMessage
                        ? convSummary.latestMessage.body
                        : "No messages yet in circle"}
                    </p>
                  </div>

                  {unread > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-600 text-white shrink-0">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Chat View */}
        <div className="md:col-span-2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl text-white font-black text-sm flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: activeConversation.patient.avatarColor || "#0D9488",
                    }}
                  >
                    {activeConversation.patient.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {activeConversation.patient.name} Circle
                      </h4>
                      <Link
                        href={`/patients/${activeConversation.patient.id}`}
                        className="text-[11px] text-teal-600 font-semibold hover:underline"
                      >
                        Chart
                      </Link>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                      <span>Caregiver: {activeConversation.patient.caregiver?.name || "Assigned"}</span>
                      {activeConversation.patient.familyMembers &&
                        activeConversation.patient.familyMembers.length > 0 && (
                          <>
                            <span>•</span>
                            <span>
                              Family:{" "}
                              {activeConversation.patient.familyMembers.map((f) => f.name).join(", ")}
                            </span>
                          </>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {activeConversation.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
                    <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      No messages yet in this care circle.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                      Share updates, medication logs, or daily observations with the patient's family and supervisors.
                    </p>
                  </div>
                ) : (
                  activeConversation.messages.map((msg) => {
                    const isOwn = msg.senderId === user?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {isOwn ? "You" : msg.senderName}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                              msg.senderType === "ADMIN"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                                : msg.senderType === "FAMILY"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                            }`}
                          >
                            {msg.senderRole}
                          </span>
                          <span className="text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[80%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                            isOwn
                              ? "bg-teal-600 text-white rounded-br-xs shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs"
                          }`}
                        >
                          {msg.body}
                        </div>

                        {isOwn && (
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5">
                            {msg.readAt ? (
                              <span className="text-teal-600 font-medium flex items-center gap-0.5">
                                <CheckCheck className="w-3 h-3" /> Read
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Delivered
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900"
              >
                <input
                  type="text"
                  required
                  placeholder={`Send an update to ${activeConversation.patient.name}'s circle...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 text-xs px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-6 text-center text-slate-400 text-xs">
              Select a patient care circle to start chatting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesClient() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading messaging center...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
