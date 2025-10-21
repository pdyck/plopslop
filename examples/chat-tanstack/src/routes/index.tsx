import { createFileRoute } from "@tanstack/react-router";
import type * as React from "react";
import { useState } from "react";
import { trpc } from "~/lib/client";
import type { ChatMessage } from "~/server/pubsub";

export const Route = createFileRoute("/")({
  component: ChatPage,
});

function ChatPage() {
  const username = `user_${Math.random()}`;
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Subscribe to messages
  trpc.messages.useSubscription(undefined, {
    onData: (message) => {
      setMessages((prev) => [...prev, message]);
    },
    onError: (err) => {
      console.error("Subscription error:", err);
    },
  });

  // Mutation to send a message
  const sendMessageMutation = trpc.sendMessage.useMutation({
    onSuccess: () => {
      console.log("Success");
    },
  });

  const handleMessageSubmit = (e: React.FormEvent) => {
    console.log("handle submit");
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const message = form.get("message") as string;

    if (message.trim() && username) {
      sendMessageMutation.mutate({
        username,
        message: message.trim(),
      });

      // Clear the form
      (e.target as HTMLFormElement).reset();
    }
  };

  // Main chat interface
  return (
    <div style={styles.container}>
      <div style={styles.chatCard}>
        <div style={styles.header}>
          <h1 style={styles.title}>plopslop Chat</h1>
          <p style={styles.subtitle}>
            Logged in as <strong>{username}</strong>
          </p>
        </div>

        <div style={styles.messagesContainer}>
          {messages.length === 0 && (
            <div style={styles.statusMessage}>
              No messages yet. Be the first to say something!
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.timestamp}
              style={{
                ...styles.message,
              }}
            >
              <div style={styles.messageHeader}>
                <span style={styles.messageUsername}>{msg.username}</span>
                <span style={styles.messageTime}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={styles.messageText}>{msg.message}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleMessageSubmit} style={styles.form}>
          <input
            type="text"
            name="message"
            placeholder="Type a message..."
            maxLength={500}
            style={styles.input}
          />
          <button type="submit" style={styles.button}>
            {sendMessageMutation.isPending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Inline styles
const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    padding: "20px",
  } as React.CSSProperties,
  usernameCard: {
    background: "white",
    borderRadius: "12px",
    padding: "40px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    maxWidth: "400px",
    width: "100%",
  } as React.CSSProperties,
  chatCard: {
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    maxWidth: "800px",
    width: "100%",
    height: "600px",
    display: "flex",
    flexDirection: "column",
  } as React.CSSProperties,
  header: {
    borderBottom: "1px solid #e0e0e0",
    paddingBottom: "15px",
    marginBottom: "20px",
  } as React.CSSProperties,
  title: {
    fontSize: "24px",
    fontWeight: "600",
    marginBottom: "5px",
  } as React.CSSProperties,
  subtitle: {
    fontSize: "14px",
    color: "#666",
  } as React.CSSProperties,
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  } as React.CSSProperties,
  statusMessage: {
    textAlign: "center",
    color: "#999",
    padding: "20px",
  } as React.CSSProperties,
  message: {
    background: "#f5f5f5",
    borderRadius: "8px",
    padding: "12px",
    maxWidth: "70%",
  } as React.CSSProperties,
  ownMessage: {
    background: "#e3f2fd",
    marginLeft: "auto",
  } as React.CSSProperties,
  messageHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "5px",
  } as React.CSSProperties,
  messageUsername: {
    fontWeight: "600",
    fontSize: "14px",
  } as React.CSSProperties,
  messageTime: {
    fontSize: "12px",
    color: "#999",
  } as React.CSSProperties,
  messageText: {
    fontSize: "14px",
    wordBreak: "break-word",
  } as React.CSSProperties,
  form: {
    display: "flex",
    gap: "10px",
  } as React.CSSProperties,
  input: {
    flex: 1,
    padding: "12px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
  } as React.CSSProperties,
  button: {
    padding: "12px 24px",
    background: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
  } as React.CSSProperties,
};
