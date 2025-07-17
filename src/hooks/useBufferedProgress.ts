import { useEffect, useState } from "react";
import RNExpoSonicPlayerModule from "../RNSonicModule";

export function useBufferedProgress<X>() {
  const [bufferProgress, setBufferProgress] = useState<number>(0);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error" | "unknown" | "seeked"
  >("unknown");

  useEffect(() => {
    const progressSub = RNExpoSonicPlayerModule.addListener(
      "onProgress",
      (event) => {
        setBufferProgress(event.progress ?? 0);
      }
    );

    const statusSub = RNExpoSonicPlayerModule.addListener(
      "onStatusChange",
      (event) => {
        setStatus(event.status ?? "unknown");
      }
    );

    return () => {
      progressSub.remove();
      statusSub.remove();
    };
  }, []);

  return { bufferProgress, status };
}
