export enum Events {
  OnProgress = "onProgress",
  OnStatusChange = "onStatusChange",
  OnPlaybackInfo = "onPlaybackInfo",
  OnMediaControlEvent = "onMediaControlEvent",
}

export enum PlayBackStatus {
  Error = "error",
  Interrupted = "interrupted",
  ResumedAfterInterruption = "resumed_after_interruption",
  RouteChangedPaused = "route_changed_paused",
  EndedInAvPlayer = "ended in av player",
  ResumeErrorNoPlayer = "resume error no player",
  ResumeErrorNoFile = "resume_error_no_file",
  SessionError = "session_error",
  Loading = "loading",
  Ready = "ready",
  Seeked = "seeked",
  Ended = "ended",
}
