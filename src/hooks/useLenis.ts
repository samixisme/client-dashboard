import { useEffect, useRef, RefObject } from 'react';
import Lenis from 'lenis';

interface UseLenisOptions {
  duration?: number;
  easing?: (t: number) => number;
  smoothWheel?: boolean;
  wheelMultiplier?: number;
  touchMultiplier?: number;
}

export function useLenis<T extends HTMLElement>(
  options: UseLenisOptions = {}
): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const wrapper = containerRef.current;

    const lenis = new Lenis({
      wrapper: wrapper,
      duration: options.duration ?? 1.2,
      easing: options.easing ?? ((t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: options.smoothWheel ?? true,
      wheelMultiplier: options.wheelMultiplier ?? 1,
      touchMultiplier: options.touchMultiplier ?? 2,
      autoResize: true,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Watch for content mutations (async data loads, React state changes)
    // so Lenis recalculates scroll limits when the DOM changes
    let resizeTimer: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => lenis.resize(), 100);
    });
    observer.observe(wrapper, { childList: true, subtree: true, attributes: true });

    return () => {
      observer.disconnect();
      clearTimeout(resizeTimer);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [options.duration, options.easing, options.smoothWheel, options.wheelMultiplier, options.touchMultiplier]);

  return containerRef;
}
