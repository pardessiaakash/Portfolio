// Accessibility helpers. Nothing here changes how things look for mouse users.

/**
 * Props that make a non-button element (a Box/div acting as a control)
 * reachable and usable from the keyboard: focusable, announced with a role
 * and label, and activated with Enter or Space like a real button.
 */
export const pressable = (onActivate, label, role = "button") => ({
  role,
  tabIndex: 0,
  ...(label ? { "aria-label": label } : {}),
  onKeyDown: (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate?.(e);
    }
  },
});
