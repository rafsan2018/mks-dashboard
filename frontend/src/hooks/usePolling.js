import { useEffect, useRef } from 'react';
import { POLL_INTERVAL } from '../constants/pollConstants';

/**
 * Runs `load` once when the page opens, then every POLL_INTERVAL ms.
 * `load({ background })`: background is true for the timed refreshes, so they do not show
 * the global loading spinner. A refresh is skipped while the previous one is still running,
 * so slow responses never pile up.
 */
export default function usePolling(load, interval = POLL_INTERVAL) {
  const running = useRef(false);

  useEffect(() => {
    const run = async (background) => {
      if (running.current) return;
      running.current = true;
      try {
        await load({ background });
      } finally {
        running.current = false;
      }
    };

    run(false);
    const id = setInterval(() => run(true), interval);
    return () => clearInterval(id);
  }, [load, interval]);
}
