/**
 * Focus the center conversation composer when Open Session is tapped.
 */
export function focusConversationComposer(): void {
  const textarea =
    document.querySelector<HTMLTextAreaElement>(".dialog-bottom-zone textarea") ??
    document.querySelector<HTMLTextAreaElement>(".keeper-dialog-frame textarea")
  textarea?.focus()
  textarea?.scrollIntoView({ behavior: "smooth", block: "nearest" })
}
