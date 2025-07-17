import {
  SlowedReverbPreset,
  EqualizerPreset,
  ReverbPreset,
  AudioPreset,
  DistortionPreset,
  PlaybackInfoEvent,
  StatusEvent,
} from "expo-sonic-ios-player"; // Update this path

export interface Track {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  album?: string;
  description?: string;
  isLive?: boolean;
  useSpatialAudio?: boolean;
}

export interface PlayerState {
  // Playback State
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;

  // Current Track
  currentTrack: Track | null;
  currentIndex: number;

  // Queue Management
  queue: Track[];
  originalQueue: Track[]; // For shuffle restoration
  history: Track[];

  // Player Settings
  isShuffled: boolean;
  repeatMode: "off" | "all" | "one";
  volume: number;

  // Audio Effects
  equalizerPreset: EqualizerPreset;
  customEQGains: number[];
  reverbPreset: ReverbPreset;
  reverbWetDryMix: number;
  distortionPreset: DistortionPreset;
  distortionWetDryMix: number;
  delayTime: number;
  delayFeedback: number;
  delayWetDryMix: number;

  isSlowedReverbEnabled: boolean;
  slowedReverbPreset: SlowedReverbPreset;
  customSlowedReverb: {
    speed: number;
    pitch: number;
    reverbAmount: number;
  };

  // UI State
  isMinimized: boolean;
  showQueue: boolean;
  showEqualizer: boolean;
  isAmbientMode: boolean;
}

export interface PlayerActions {
  // Playback Controls
  play: (track?: Track, index?: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;

  // Queue Management
  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  addToQueueNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;

  // Navigation
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  skipToIndex: (index: number) => Promise<void>;

  // Shuffle & Repeat
  toggleShuffle: () => void;
  setRepeatMode: (mode: "off" | "all" | "one") => void;

  // Volume
  setVolume: (volume: number) => void;

  // Equalizer
  setEqualizerPreset: (preset: EqualizerPreset) => Promise<void>;
  setBandGain: (band: number, gain: number) => Promise<void>;
  resetEqualizer: () => Promise<void>;

  // Audio Effects
  setReverbPreset: (preset: ReverbPreset) => Promise<void>;
  setReverbWetDryMix: (mix: number) => Promise<void>;
  setDistortionPreset: (preset: DistortionPreset) => Promise<void>;
  setDistortionWetDryMix: (mix: number) => Promise<void>;
  setDelayTime: (time: number) => Promise<void>;
  setDelayFeedback: (feedback: number) => Promise<void>;
  setDelayWetDryMix: (mix: number) => Promise<void>;
  applyAudioPreset: (preset: AudioPreset) => Promise<void>;

  // Slowed Reverb
  enableSlowedReverb: () => Promise<void>;
  disableSlowedReverb: () => Promise<void>;
  toggleSlowedReverb: () => Promise<void>;
  setSlowedReverbPreset: (preset: SlowedReverbPreset) => Promise<void>;
  setCustomSlowedReverb: (
    speed: number,
    pitch: number,
    reverbAmount: number
  ) => Promise<void>;

  // Spatial Audio

  // Settings
  toggleAmbientMode: (enabled: boolean) => Promise<void>;

  // UI Controls
  setMinimized: (minimized: boolean) => void;
  setShowQueue: (show: boolean) => void;
  setShowEqualizer: (show: boolean) => void;

  // Internal State Updates (called by native events)
  updatePlaybackInfo: (info: PlaybackInfoEvent) => void;
  updateStatus: (status: StatusEvent) => void;
  handleTrackEnd: () => void;

  // Initialization
  initialize: () => Promise<void>;
}

export interface IPlayerStore extends PlayerState, PlayerActions {}
