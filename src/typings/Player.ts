export interface AudioPlaybackOptions {
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  album?: string;
  description?: string;
  isLive?: boolean;
  /**
   * @description This function is not preferred for using right now.
   * It is still work in progress and may not work as expected.
   */
  useSpatialAudio?: boolean;
}

export type SlowedReverbPreset = "classic" | "dreamy" | "subtle" | "heavy";
export type TrackMetadata = {
  title?: string;
  artist?: string;
  artworkUri?: string; // remote or local (e.g., from `Image.resolveAssetSource`)
  duration?: number;
};

export type SlowedReverbPresetInfo = {
  name: SlowedReverbPreset;
  speed: number;
  pitch: number;
  reverbAmount: number;
  delayAmount: number;
  delayTime: number;
  delayFeedback: number;
  description: string;
};

/**
 *
 * Native event payloads
 */
export type ProgressEvent = {
  progress: number;
};

export type StatusEvent = {
  status: "loading" | "ready" | "error" | "seeked" | "unknown";
};

export interface AudioPlayerInitializationConfig {
  enableRemoteControls?: boolean;
  skipForwardSeconds?: number;
  skipBackwardSeconds?: number;
  enableNextTrack?: boolean;
  enablePreviousTrack?: boolean;
}

export type PlaybackInfoEvent = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
};

/**
 * Equalizer preset names
 */
export type EqualizerPreset =
  | "flat"
  | "rock"
  | "pop"
  | "jazz"
  | "classical"
  | "bass"
  | "treble"
  | "vocal";

/**
 * Reverb preset names
 */
export type ReverbPreset =
  | "smallroom"
  | "mediumroom"
  | "largeroom"
  | "mediumhall"
  | "largehall"
  | "plate"
  | "cathedral";

/**
 * Audio preset names (combinations of effects)
 */
export type AudioPreset = "normal" | "concert" | "studio";

export interface IPlayOption {
  /**
   *
   *
   * @type {number}
   * @description The fade-in duration in milliseconds.
   * @memberof IPlayOption
   */
  fadeIn?: number;
}

/**
 * Distortion preset names
 */
export type DistortionPreset =
  | "drumsbitterbuzz"
  | "drumsbufferlayer"
  | "drumslofi"
  | "multibrokenspeaker"
  | "multicellularcpa"
  | "multidecimated1"
  | "multidecimated2"
  | "multidecimated3"
  | "multidecimated4"
  | "multidistortioncubed"
  | "multiecho1"
  | "multiecho2"
  | "multiechotight1"
  | "multiechotight2"
  | "multieverything"
  | "multiextrasmallroom"
  | "speechalienchange"
  | "speechcosmicinterference"
  | "speechgoldentone"
  | "speechradiodifference"
  | "speechwavelform";
