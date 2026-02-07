import { useEffect } from 'react';
import Lenis from 'lenis';

interface SmoothScrollConfig {
  duration?: number;
  easing?: (t: number) => number;
}

/**
 * Global smooth scroll hook using Lenis for ALL scrollable elements.
 * Creates Lenis instances lazily as elements are scrolled.
 * Uses WeakMap for automatic cleanup when elements are removed from DOM.
 */
export function useGlobalSmoothScroll(config?: SmoothScrollConfig): void {
  useEffect(() => {
    const duration = config?.duration ?? 0.8;
    const easing = config?.easing ?? ((t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)));

    // Store Lenis instances per element
    const lenisInstances = new WeakMap<Element, Lenis>();
    const rafIds = new WeakMap<Element, number>();

    const findScrollableParent = (el: Element | null): Element | null => {
      while (el) {
        // Skip main elements (handled by separate Lenis in layout)
        if (el.tagName === 'MAIN') return null;

        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;

        if (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight
        ) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    const getOrCreateLenis = (element: Element): Lenis => {
      let lenis = lenisInstances.get(element);

      if (!lenis) {
        lenis = new Lenis({
          wrapper: element as HTMLElement,
          content: element as HTMLElement,
          duration,
          easing,
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          wheelMultiplier: 1,
          touchMultiplier: 2,
          autoResize: true,
        });

        lenisInstances.set(element, lenis);

        // Start RAF loop for this instance
        const raf = (time: number) => {
          lenis!.raf(time);
          const id = requestAnimationFrame(raf);
          rafIds.set(element, id);
        };
        requestAnimationFrame(raf);
      }

      return lenis;
    };

    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as Element;
      const scrollable = findScrollableParent(target);

      if (!scrollable) return;

      // Ensure Lenis instance exists for this element
      getOrCreateLenis(scrollable);
    };

    // Listen for wheel to lazily create Lenis instances
    document.addEventListener('wheel', handleWheel, { passive: true });

    // Cleanup observer for removed elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node instanceof Element) {
            const lenis = lenisInstances.get(node);
            if (lenis) {
              const rafId = rafIds.get(node);
              if (rafId) cancelAnimationFrame(rafId);
              lenis.destroy();
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('wheel', handleWheel);
      observer.disconnect();
    };
  }, [config?.duration, config?.easing]);
}
