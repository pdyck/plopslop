import type { Plugin } from "./types.js";

export class PluginChain {
  constructor(private readonly plugins: Plugin[]) {}

  async publish(
    message: string,
    context: Record<string, unknown>,
    finalAction: () => Promise<string | undefined>,
  ): Promise<string | undefined> {
    return this.executeChain("publish", message, context, finalAction);
  }

  async subscribe(
    message: string,
    context: Record<string, unknown>,
    finalAction: () => Promise<string | undefined>,
  ): Promise<string | undefined> {
    return this.executeChain("subscribe", message, context, finalAction);
  }

  private async executeChain(
    hookType: "publish" | "subscribe",
    message: string,
    context: Record<string, unknown>,
    finalAction: () => Promise<string | undefined>,
  ): Promise<string | undefined> {
    const pluginsWithHook = this.plugins.filter((p) => p[hookType]);

    if (pluginsWithHook.length === 0) {
      return finalAction();
    }

    let index = 0;
    let result: string | undefined;

    const next = async (): Promise<void> => {
      if (index >= pluginsWithHook.length) {
        result = await finalAction();
        return;
      }

      const plugin = pluginsWithHook[index++];
      const hook = plugin[hookType];

      if (hook) {
        await hook(message, context, next);
      } else {
        await next();
      }
    };

    await next();
    return result;
  }
}
