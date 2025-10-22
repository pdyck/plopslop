import { useEffect, useRef, useState } from "react";
import type { Message } from "../server/pubsub";
import { trpc } from "../utils/trpc";

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [username, setUsername] = useState("");
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUsername(`user_${String(Math.random()).substring(2, 6)}`);
  }, []);

  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  trpc.chat.onMessage.useSubscription(undefined, {
    onData(message) {
      setMessages((prev) => [...prev, message]);
    },
    onError(err) {
      console.error("Subscription error:", err);
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: should scroll when there are new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    try {
      await sendMessageMutation.mutateAsync({
        username,
        message: inputValue,
        timestamp: Date.now(),
      });
      setInputValue("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Redis PubSub Chat (tRPC)</h1>
      <div style={styles.messagesContainer}>
        {messages.map((msg) => (
          <div key={`${msg.username}${msg.timestamp}`} style={styles.message}>
            <strong>{msg.username}:</strong> {msg.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={styles.inputContainer}>
        <span style={styles.username}>{username}</span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a message..."
          style={styles.input}
        />
        <button type="button" onClick={handleSendMessage} style={styles.button}>
          Send
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    maxWidth: "600px",
    margin: "50px auto",
    padding: "20px",
  },
  title: {
    fontSize: "24px",
    marginBottom: "20px",
  },
  messagesContainer: {
    border: "1px solid #ddd",
    height: "300px",
    overflowY: "auto" as const,
    padding: "10px",
    marginBottom: "10px",
    backgroundColor: "#fff",
    borderRadius: "4px",
  },
  message: {
    margin: "5px 0",
    padding: "5px",
    backgroundColor: "#f0f0f0",
    borderRadius: "4px",
  },
  inputContainer: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  username: {
    fontSize: "14px",
    color: "#666",
    minWidth: "80px",
  },
  input: {
    flex: 1,
    padding: "8px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  button: {
    padding: "8px 16px",
    fontSize: "14px",
    backgroundColor: "#0070f3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};
