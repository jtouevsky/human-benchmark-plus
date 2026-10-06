"use client";
import { useEffect, useRef } from "react";
export function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const root = ref.current;
    const background = document.querySelector("main");
    const wasInert = background?.inert || false;
    const isPortal = background && root && !background.contains(root);
    if (isPortal) background.inert = true;
    const selector =
      'button:not([disabled]), input:not([disabled]), [tabindex="0"]';
    const focus = () => root?.querySelector<HTMLElement>(selector)?.focus();
    if (!root?.contains(document.activeElement)) focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const all = Array.from(
        root.querySelectorAll<HTMLElement>(selector),
      ).filter((e) => e.offsetParent !== null);
      if (!all.length) return;
      const first = all[0],
        last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root?.addEventListener("keydown", listener);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      root?.removeEventListener("keydown", listener);
      document.body.style.overflow = overflow;
      if (isPortal) background.inert = wasInert;
      previous?.focus();
    };
  }, []);
  return ref;
}
