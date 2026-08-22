"use client";

import { useEffect } from "react";

export function CategoryDropdownWheelBoost() {
  useEffect(() => {
    function onWheel(event: WheelEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const dropdown = target.closest<HTMLElement>("[data-modal-dropdown]");
      if (!dropdown) return;

      const scroller = Array.from(dropdown.querySelectorAll<HTMLElement>("div")).find((element) => {
        const style = window.getComputedStyle(element);
        return (style.overflowY === "auto" || style.overflowY === "scroll") && element.scrollHeight > element.clientHeight;
      });

      if (!scroller || !scroller.contains(target)) return;

      const rawDelta = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? event.deltaY * 36
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? event.deltaY * scroller.clientHeight
          : event.deltaY;

      if (!rawDelta) return;

      // Trackpads usually emit small deltas: keep them precise but more responsive.
      // Mouse wheels emit larger deltas: jump roughly 3–4 category rows per notch.
      const amount = Math.abs(rawDelta) < 40
        ? rawDelta * 2.2
        : Math.sign(rawDelta) * Math.max(150, Math.min(240, Math.abs(rawDelta) * 1.5));

      event.preventDefault();
      event.stopPropagation();
      scroller.scrollTop += amount;
    }

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
  }, []);

  return null;
}
