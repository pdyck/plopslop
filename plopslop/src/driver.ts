export type MessageHandler<TMessage = string, TContext = object> = (
  message: TMessage,
  context?: TContext,
) => void;

export interface PubSubDriver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, message: string): Promise<void>;
  subscribe(topic: string, handler: MessageHandler): Promise<string>;
  unsubscribe(subscription: string): Promise<void>;
}
