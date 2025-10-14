import type { Context, Plugin } from "./types.js";

export class PluginChain {
  constructor(private readonly plugins: Plugin[]) {}

  async publish<TPayload>(
    payload: TPayload,
    context: Context,
    finalAction: () => Promise<string | undefined>,
  ): Promise<string | undefined> {
    return this.executeChain("publish", payload, context, finalAction);
  }

  async subscribe<TPayload>(
    payload: TPayload,
    context: Context,
    finalAction: () => Promise<string | undefined>,
  ): Promise<string | undefined> {
    return this.executeChain("subscribe", payload, context, finalAction);
  }

  private async executeChain<TPayload>(
    hookType: "publish" | "subscribe",
    payload: TPayload,
    context: Context,
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
        await hook(payload, context, next);
      } else {
        await next();
      }
    };

    await next();
    return result;
  }
}
