import { useEffect, useState } from "react";

export function useNow(refreshMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, refreshMs);

    return () => clearInterval(interval);
  }, [refreshMs]);

  return now;
}
