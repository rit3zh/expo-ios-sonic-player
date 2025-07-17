import { useEffect, useState } from "react";
import RNExpoSonicPlayerModule from "../RNSonicModule";

type StatusType = "loading" | "ready" | "error" | "seeked" | "unknown";

export function usePlayer<TapGesture>() {
  const [status, setStatus] = useState<StatusType>("unknown");
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  useEffect(() => {
    const statusSub = RNExpoSonicPlayerModule.addListener(
      "onStatusChange",
      (event) => {
        setStatus(event.status);
      }
    );
    const playbackSub = RNExpoSonicPlayerModule.addListener(
      "onPlaybackInfo",
      (event) => {
        setCurrentTime(event.currentTime ?? 0);
        setDuration(event.duration ?? 0);
        setIsPlaying(event.isPlaying ?? false);
      }
    );

    return () => {
      statusSub.remove();
      playbackSub.remove();
    };
  }, []);

  const progress = duration > 0 ? currentTime / duration : 0;
  const remainingTime = Math.max(duration - currentTime, 0); // never negative

  return {
    status,
    isPlaying,
    duration,
    currentTime,
    progress,
    remainingTime,
  };
}
