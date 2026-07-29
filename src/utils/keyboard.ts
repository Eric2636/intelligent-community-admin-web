export type EnterKeyEvent = {
  key?: string;
  keyCode?: number;
  isComposing?: boolean;
  repeat?: boolean;
  preventDefault?: () => void;
  stopPropagation?: () => void;
  stopImmediatePropagation?: () => void;
};

export function isPlainEnter(event: EnterKeyEvent): boolean {
  return event.key === 'Enter' && event.keyCode !== 229 && !event.isComposing && !event.repeat;
}

export function submitOnPlainEnter(
  event: EnterKeyEvent,
  submit: () => void,
  options: { loading?: boolean; stopPropagation?: boolean } = {},
): boolean {
  if (options.loading || !isPlainEnter(event)) return false;
  if (options.stopPropagation) {
    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
  }
  submit();
  return true;
}
