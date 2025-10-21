import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { createPubSub } from "@plopslop/core";
import { redis } from "@plopslop/redis";
import { Hono } from "hono";
import { html } from "hono/html";
import type { FC, PropsWithChildren } from "hono/jsx";
import z from "zod";

const MessageSchema = z.object({
  username: z.string(),
  message: z.string(),
  timestamp: z.number(),
});

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

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

app.get(
  "/ws",
  upgradeWebSocket(() => {
    let clientId = 0;
    let closed = false;

    return {
      onOpen: async (_evt, ws) => {
        clientId = ++clientCounter;
        console.log(`Client ${clientId} connected`);

        for await (const { payload } of pubsub.messageReceived.subscribe()) {
          if (closed) break;

          console.log(`Client ${clientId} is receiving message`);
          const serialized = JSON.stringify(payload);
          ws.send(serialized);
        }
      },
      onMessage: async (event, _ws) => {
        console.log(`Client ${clientId} sent message`);
        const deserialized = JSON.parse(String(event.data));
        const message = MessageSchema.parse(deserialized);
        await pubsub.messageReceived.publish(message);
      },
      onClose: () => {
        console.log(`Client ${clientId} disconnected`);
        closed = true;
      },
    };
  }),
);

app.get("/", (c) => {
  return c.html(
    <html lang="en">
      <head>
        <title>Redis PubSub Chat</title>
        {html`
          <style>
            body {
              font-family: system-ui;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
            }
            #messages {
              border: 1px solid #ddd;
              height: 300px;
              overflow-y: auto;
              padding: 10px;
              margin-bottom: 10px;
            }
            #input {
              width: 60%;
              padding: 8px;
            }
            #send {
              padding: 8px 16px;
            }
            .message {
              margin: 5px 0;
              padding: 5px;
              background: #f0f0f0;
              border-radius: 4px;
            }
          </style>
        `}
      </head>
      <body>
        <h1>Redis PubSub Chat</h1>
        <div id="messages"></div>
        <span id="name"></span>
        <input id="input" type="text" placeholder="Type a message..." />
        <button type="button" id="send">
          Send
        </button>
        {html`
          <script>
            const username = "user_" + String(Math.random()).substring(2, 6);
            const ws = new WebSocket("ws://localhost:3000/ws");
            const messages = document.getElementById("messages");
            const name = document.getElementById("name");
            const input = document.getElementById("input");
            const send = document.getElementById("send");
            name.textContent = username;

            ws.onmessage = (event) => {
              const data = JSON.parse(event.data);
              const div = document.createElement("div");
              div.className = "message";
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
                input.value = "";
              }
            };

            send.onclick = sendMessage;
            input.onkeypress = (e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            };
          </script>
        `}
      </body>
    </html>,
  );
});

const server = serve({
  fetch: app.fetch,
  port: 3000,
});

injectWebSocket(server);

console.log("Server running on http://localhost:3000");

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  process.exit(0);
});
