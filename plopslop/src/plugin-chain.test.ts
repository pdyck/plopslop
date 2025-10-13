import { PluginChain } from "./plugin-chain.js";
import type { Plugin } from "./types.js";

describe("PluginChain", () => {
  describe("publish", () => {
    it("should execute publish hooks in order", async () => {
      const callOrder: string[] = [];

      const plugin1: Plugin = {
        name: "plugin-1",
        publish: vi.fn(async (_, __, next) => {
          callOrder.push("plugin-1");
          await next();
        }),
      };

      const plugin2: Plugin = {
        name: "plugin-2",
        publish: vi.fn(async (_, __, next) => {
          callOrder.push("plugin-2");
          await next();
        }),
      };

      const chain = new PluginChain([plugin1, plugin2]);
      const finalAction = vi.fn(async () => {
        callOrder.push("final");
        return undefined;
      });

      await chain.publish("test-message", { topic: "test" }, finalAction);

      expect(callOrder).toEqual(["plugin-1", "plugin-2", "final"]);
      expect(plugin1.publish).toHaveBeenCalled();
      expect(plugin2.publish).toHaveBeenCalled();
      expect(finalAction).toHaveBeenCalled();
    });

    it("should pass message and context to each plugin", async () => {
      const plugin: Plugin = {
        name: "test-plugin",
        publish: vi.fn(async (_, __, next) => {
          await next();
        }),
      };

      const chain = new PluginChain([plugin]);
      const finalAction = vi.fn(async () => undefined);
      const message = "test-message";
      const context = { topic: "test-topic", data: 123 };

      await chain.publish(message, context, finalAction);

      expect(plugin.publish).toHaveBeenCalledWith(
        message,
        context,
        expect.any(Function),
      );
    });

    it("should skip plugins without publish hook", async () => {
      const callOrder: string[] = [];

      const plugin1: Plugin = {
        name: "plugin-1",
        subscribe: vi.fn(async (_, __, next) => {
          callOrder.push("plugin-1-subscribe");
          await next();
        }),
      };

      const plugin2: Plugin = {
        name: "plugin-2",
        publish: vi.fn(async (_, __, next) => {
          callOrder.push("plugin-2-publish");
          await next();
        }),
      };

      const chain = new PluginChain([plugin1, plugin2]);
      const finalAction = vi.fn(async () => {
        callOrder.push("final");
        return undefined;
      });

      await chain.publish("test-message", { topic: "test" }, finalAction);

      expect(callOrder).toEqual(["plugin-2-publish", "final"]);
      expect(plugin1.subscribe).not.toHaveBeenCalled();
      expect(plugin2.publish).toHaveBeenCalled();
    });

    it("should call final action when no plugins have publish hook", async () => {
      const plugin: Plugin = {
        name: "test-plugin",
        subscribe: vi.fn(async (_, __, next) => {
          await next();
        }),
      };

      const chain = new PluginChain([plugin]);
      const finalAction = vi.fn(async () => undefined);

      await chain.publish("test-message", { topic: "test" }, finalAction);

      expect(finalAction).toHaveBeenCalled();
      expect(plugin.subscribe).not.toHaveBeenCalled();
    });

    it("should call final action with empty plugin list", async () => {
      const chain = new PluginChain([]);
      const finalAction = vi.fn(async () => undefined);

      await chain.publish("test-message", { topic: "test" }, finalAction);

      expect(finalAction).toHaveBeenCalled();
    });

    it("should return result from final action", async () => {
      const chain = new PluginChain([]);
      const finalAction = vi.fn(async () => "result-value");

      const result = await chain.publish(
        "test-message",
        { topic: "test" },
        finalAction,
      );

      expect(result).toBe("result-value");
    });

    it("should allow plugins to modify context", async () => {
      const plugin: Plugin = {
        name: "test-plugin",
        publish: vi.fn(async (_, context, next) => {
          context.modified = true;
          await next();
        }),
      };

      const chain = new PluginChain([plugin]);
      const context = { topic: "test" };
      const finalAction = vi.fn(async () => {
        expect(context).toHaveProperty("modified", true);
        return undefined;
      });

      await chain.publish("test-message", context, finalAction);
    });

    it("should stop execution if plugin does not call next", async () => {
      const callOrder: string[] = [];

      const plugin1: Plugin = {
        name: "plugin-1",
        publish: vi.fn(async (_, __, ___) => {
          callOrder.push("plugin-1");
          // Intentionally not calling next()
        }),
      };

      const plugin2: Plugin = {
        name: "plugin-2",
        publish: vi.fn(async (_, __, next) => {
          callOrder.push("plugin-2");
          await next();
        }),
      };

      const chain = new PluginChain([plugin1, plugin2]);
      const finalAction = vi.fn(async () => {
        callOrder.push("final");
        return undefined;
      });

      await chain.publish("test-message", { topic: "test" }, finalAction);

      expect(callOrder).toEqual(["plugin-1"]);
      expect(plugin2.publish).not.toHaveBeenCalled();
      expect(finalAction).not.toHaveBeenCalled();
    });

    it("should handle async plugins correctly", async () => {
      const plugin: Plugin = {
        name: "test-plugin",
        publish: vi.fn(async (_, __, next) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          await next();
        }),
      };

      const chain = new PluginChain([plugin]);
      const finalAction = vi.fn(async () => undefined);

      await chain.publish("test-message", { topic: "test" }, finalAction);

      expect(plugin.publish).toHaveBeenCalled();
      expect(finalAction).toHaveBeenCalled();
    });

    it("should propagate errors from plugins", async () => {
      const plugin: Plugin = {
        name: "test-plugin",
        publish: vi.fn(async () => {
          throw new Error("Plugin error");
        }),
      };

      const chain = new PluginChain([plugin]);
      const finalAction = vi.fn(async () => undefined);

      await expect(
        chain.publish("test-message", { topic: "test" }, finalAction),
      ).rejects.toThrow("Plugin error");
    });

    it("should propagate errors from final action", async () => {
      const chain = new PluginChain([]);
      const finalAction = vi.fn(async () => {
        throw new Error("Final action error");
      });

      await expect(
        chain.publish("test-message", { topic: "test" }, finalAction),
      ).rejects.toThrow("Final action error");
    });
  });

  describe("subscribe", () => {
    it("should execute subscribe hooks in order", async () => {
      const callOrder: string[] = [];

      const plugin1: Plugin = {
        name: "plugin-1",
        subscribe: vi.fn(async (_, __, next) => {
          callOrder.push("plugin-1");
          await next();
        }),
      };

      const plugin2: Plugin = {
        name: "plugin-2",
        subscribe: vi.fn(async (_, __, next) => {
          callOrder.push("plugin-2");
          await next();
        }),
      };

      const chain = new PluginChain([plugin1, plugin2]);
      const finalAction = vi.fn(async () => {
        callOrder.push("final");
        return undefined;
      });

      await chain.subscribe("test-message", { topic: "test" }, finalAction);

      expect(callOrder).toEqual(["plugin-1", "plugin-2", "final"]);
      expect(plugin1.subscribe).toHaveBeenCalled();
      expect(plugin2.subscribe).toHaveBeenCalled();
      expect(finalAction).toHaveBeenCalled();
    });

    it("should pass message and context to each plugin", async () => {
      const plugin: Plugin = {
        name: "test-plugin",
        subscribe: vi.fn(async (_, __, next) => {
          await next();
        }),
      };

      const chain = new PluginChain([plugin]);
      const finalAction = vi.fn(async () => undefined);
      const message = "test-message";
      const context = { topic: "test-topic", data: 123 };

      await chain.subscribe(message, context, finalAction);

      expect(plugin.subscribe).toHaveBeenCalledWith(
        message,
        context,
        expect.any(Function),
      );
    });

    it("should skip plugins without subscribe hook", async () => {
      const callOrder: string[] = [];

      const plugin1: Plugin = {
        name: "plugin-1",
        publish: vi.fn(async (_, __, next) => {
          callOrder.push("plugin-1-publish");
          await next();
        }),
      };

      const plugin2: Plugin = {
        name: "plugin-2",
        subscribe: vi.fn(async (_, __, next) => {
          callOrder.push("plugin-2-subscribe");
          await next();
        }),
      };

      const chain = new PluginChain([plugin1, plugin2]);
      const finalAction = vi.fn(async () => {
        callOrder.push("final");
        return undefined;
      });

      await chain.subscribe("test-message", { topic: "test" }, finalAction);

      expect(callOrder).toEqual(["plugin-2-subscribe", "final"]);
      expect(plugin1.publish).not.toHaveBeenCalled();
      expect(plugin2.subscribe).toHaveBeenCalled();
    });

    it("should call final action when no plugins have subscribe hook", async () => {
      const plugin: Plugin = {
        name: "test-plugin",
        publish: vi.fn(async (_, __, next) => {
          await next();
        }),
      };

      const chain = new PluginChain([plugin]);
      const finalAction = vi.fn(async () => undefined);

      await chain.subscribe("test-message", { topic: "test" }, finalAction);

      expect(finalAction).toHaveBeenCalled();
      expect(plugin.publish).not.toHaveBeenCalled();
    });

    it("should call final action with empty plugin list", async () => {
      const chain = new PluginChain([]);
      const finalAction = vi.fn(async () => undefined);

      await chain.subscribe("test-message", { topic: "test" }, finalAction);

      expect(finalAction).toHaveBeenCalled();
    });

    it("should return result from final action", async () => {
      const chain = new PluginChain([]);
      const finalAction = vi.fn(async () => "result-value");

      const result = await chain.subscribe(
        "test-message",
        { topic: "test" },
        finalAction,
      );

      expect(result).toBe("result-value");
    });
  });

  describe("publish and subscribe isolation", () => {
    it("should execute only publish hooks when calling publish", async () => {
      const plugin: Plugin = {
        name: "test-plugin",
        publish: vi.fn(async (_, __, next) => {
          await next();
        }),
        subscribe: vi.fn(async (_, __, next) => {
          await next();
        }),
      };

      const chain = new PluginChain([plugin]);
      const finalAction = vi.fn(async () => undefined);

      await chain.publish("test-message", { topic: "test" }, finalAction);

      expect(plugin.publish).toHaveBeenCalled();
      expect(plugin.subscribe).not.toHaveBeenCalled();
    });

    it("should execute only subscribe hooks when calling subscribe", async () => {
      const plugin: Plugin = {
        name: "test-plugin",
        publish: vi.fn(async (_, __, next) => {
          await next();
        }),
        subscribe: vi.fn(async (_, __, next) => {
          await next();
        }),
      };

      const chain = new PluginChain([plugin]);
      const finalAction = vi.fn(async () => undefined);

      await chain.subscribe("test-message", { topic: "test" }, finalAction);

      expect(plugin.subscribe).toHaveBeenCalled();
      expect(plugin.publish).not.toHaveBeenCalled();
    });
  });

  describe("complex scenarios", () => {
    it("should handle multiple plugins with mixed hooks", async () => {
      const callOrder: string[] = [];

      const plugin1: Plugin = {
        name: "plugin-1",
        publish: vi.fn(async (_, __, next) => {
          callOrder.push("plugin-1-publish");
          await next();
        }),
        subscribe: vi.fn(async (_, __, next) => {
          callOrder.push("plugin-1-subscribe");
          await next();
        }),
      };

      const plugin2: Plugin = {
        name: "plugin-2",
        publish: vi.fn(async (_, __, next) => {
          callOrder.push("plugin-2-publish");
          await next();
        }),
      };

      const plugin3: Plugin = {
        name: "plugin-3",
        subscribe: vi.fn(async (_, __, next) => {
          callOrder.push("plugin-3-subscribe");
          await next();
        }),
      };

      const chain = new PluginChain([plugin1, plugin2, plugin3]);
      const finalAction = vi.fn(async () => undefined);

      callOrder.length = 0;
      await chain.publish("test", { topic: "test" }, finalAction);
      expect(callOrder).toEqual(["plugin-1-publish", "plugin-2-publish"]);

      callOrder.length = 0;
      await chain.subscribe("test", { topic: "test" }, finalAction);
      expect(callOrder).toEqual(["plugin-1-subscribe", "plugin-3-subscribe"]);
    });
  });
});
