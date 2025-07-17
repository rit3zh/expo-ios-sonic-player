import { NativeModule } from "expo-modules-core/types";
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

/**
 * Native module declaration
 */
export interface RNExpoSonicPlayerType
  extends NativeModule<{
    onProgress: (event: ProgressEvent) => void;
    onStatusChange: (event: StatusEvent) => void;
    onPlaybackInfo: (event: PlaybackInfoEvent) => void;
    onSongEnd: () => void;
    onMediaControlEvent: (e: any) => void;
  }> {
  initialize(options: AudioPlayerInitializationConfig): Promise<void>;

  // MARK: - Basic Playback Controls
  play(options: AudioPlaybackOptions): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(seconds: number): Promise<void>;

  // ✅ ADD THIS - Missing from your TS file
  setMetaDataForCurrentTrack(metadata: TrackMetadata): Promise<void>;

  toggleAmbientMode: <T extends boolean>(enabled: T) => Promise<void>;

  // MARK: - Equalizer Controls
  setBandGain(band: number, gain: number): Promise<void>;
  getBandGain(band: number): Promise<number | null>;
  getAllBandGains(): Promise<number[]>;
  resetEqualizer(): Promise<void>;
  applyEqualizerPreset(presetName: EqualizerPreset): Promise<void>;

  // MARK: - Reverb Controls
  setReverbWetDryMix(wetDryMix: number): Promise<void>;
  setReverbPreset(presetName: ReverbPreset): Promise<void>;

  // MARK: - Delay Controls
  setDelayTime(delayTime: number): Promise<void>;
  setDelayFeedback(feedback: number): Promise<void>;
  setDelayWetDryMix(wetDryMix: number): Promise<void>;

  // MARK: - Distortion Controls
  setDistortionWetDryMix(wetDryMix: number): Promise<void>;
  setDistortionPreset(presetName: DistortionPreset): Promise<void>;

  // ✅ REMOVE THESE - Not in your Swift file
  // setVolume(volume: number): Promise<void>;
  // setLoop(loop: boolean): void;

  enableSlowedReverb(): Promise<void>;
  disableSlowedReverb(): Promise<void>;
  toggleSlowedReverb(): Promise<void>;
  setSlowedReverb(
    speed: number,
    pitch: number,
    reverbAmount: number
  ): Promise<void>;
  applySlowedReverbPreset(presetName: SlowedReverbPreset): Promise<void>;

  // MARK: - Slowed Reverb Helpers
  getAvailableSlowedReverbPresets(): Promise<SlowedReverbPreset[]>;
  getSlowedReverbPresetInfo(
    presetName: SlowedReverbPreset
  ): Promise<SlowedReverbPresetInfo>;

  // MARK: - Audio Preset Controls (combinations)
  applyAudioPreset(presetName: AudioPreset): Promise<void>;

  // MARK: - Helper Functions
  getAvailableEqualizerPresets(): Promise<string[]>;
  getAvailableReverbPresets(): Promise<string[]>;
  getAvailableAudioPresets(): Promise<string[]>;
  getBandFrequencies(): Promise<number[]>;

  // ✅ REMOVE THIS - Not in your Swift file
  // setValueAsync(value: string): Promise<void>;

  // MARK: - Constants
  PI: number;
  MAX_GAIN: number;
  MIN_GAIN: number;
  BAND_COUNT: number;
}
