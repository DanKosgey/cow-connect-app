import { useEffect, useRef, useState } from 'react';

interface IntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

/**
 * Custom hook to observe when an element enters or leaves the viewport
 * @param options - IntersectionObserver options
 * @returns Ref and entry state
 */
export function useIntersectionObserver(
  options: IntersectionObserverOptions = {}
) {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false,
  } = options;

  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [node, setNode] = useState<Element | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const prevNode = useRef<Element | null>(null);

  useEffect(() => {
    // If frozen and we have an entry, don't observe anything
    if (freezeOnceVisible && entry?.isIntersecting) {
      return;
    }

    // If we have an observer and the node has changed, disconnect
    if (observer.current && prevNode.current !== node) {
      observer.current.disconnect();
      prevNode.current = null;
    }

    // If we have a node, observe it
    if (node) {
      prevNode.current = node;
      observer.current = new IntersectionObserver(
        ([entry]) => {
          setEntry(entry);
        },
        {
          threshold,
          root,
          rootMargin,
        }
      );

      observer.current.observe(node);
    }

    // Cleanup function
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [node, threshold, root, rootMargin, freezeOnceVisible, entry?.isIntersecting]);

  return { ref: setNode, entry };
}