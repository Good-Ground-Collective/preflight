/** A message to report at line 1 of the linted file. */
export interface LayoutViolation<MessageId extends string> {
  readonly messageId: MessageId;
  readonly data: Readonly<Record<string, string>>;
}
