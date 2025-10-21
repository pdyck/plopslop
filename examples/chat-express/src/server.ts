import { createServer } from "node:http";
import { createPubSub } from "@plopslop/core";
import { redis } from "@plopslop/redis";
import express from "express";
import { WebSocketServer } from "ws";
import z from "zod";

const MessageSchema = z.object({
  username: z.string(),
  message: z.string(),
  timestamp: z.number(),
});

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const pubsub = createPubSub({
  driver: redis(),
  topics: {
    messageReceived: {
      name: "message.received",
      schema: MessageSchema,
    },
  },
});

let clientCounter = 0;

wss.on("connection", async (ws) => {
  const clientId = ++clientCounter;
  console.log(`Client ${clientId} connected`);

  ws.on("message", async (data) => {
    console.log(`Client ${clientId} sent message`);
    const deserialized = JSON.parse(String(data));
    const message = MessageSchema.parse(deserialized);
    await pubsub.messageReceived.publish(message);
  });

  let closed = false;
  ws.on("close", () => {
    console.log(`Client ${clientId} disconnected`);
    closed = true;
  });

  for await (const { payload } of pubsub.messageReceived.subscribe()) {
    if (closed) break;

    console.log(`Client ${clientId} is receiving message`);
    const serialized = JSON.stringify(payload);
    ws.send(serialized);
  }
});

app.get("/", (_, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Redis PubSub Chat</title>
        <style>
        body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
        #messages { border: 1px solid #ddd; height: 300px; overflow-y: auto; padding: 10px; margin-bottom: 10px; }
        #input { width: 60%; padding: 8px; }
        #send { padding: 8px 16px; }
        .message { margin: 5px 0; padding: 5px; background: #f0f0f0; border-radius: 4px; }
        </style>
    </head>
    <body>
        <h1>Redis PubSub Chat</h1>
        <div id="messages"></div>
        <span id="name"></span>
        <input id="input" type="text" placeholder="Type a message...">
        <button id="send">Send</button>
        
        <script>
        const username = "user_" + String(Math.random()).substring(2, 6);
        const ws = new WebSocket('ws://localhost:3000');
        const messages = document.getElementById('messages');
        const name = document.getElementById('name');
        const input = document.getElementById('input');
        const send = document.getElementById('send');
        name.textContent = username;

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const div = document.createElement('div');
            div.className = 'message';
            div.textContent = data.username + ": " + data.message;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        };

        const sendMessage = () => {
            if (input.value) {
            const serialized = JSON.stringify({
              username,
              message: input.value,
              timestamp: Date.now(),
            });
            ws.send(serialized);
            input.value = '';
            }
        };

        send.onclick = sendMessage;
        input.onkeypress = (e) => {
          if (e.key === "Enter") {
            sendMessage();
          }
        };
        </script>
    </body>
    </html>
  `);
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  process.exit(0);
});
