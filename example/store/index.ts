import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import RNExpoSonicPlayerModule, {
  AudioPlaybackOptions,
  AudioPreset,
  DistortionPreset,
  EqualizerPreset,
  PlaybackInfoEvent,
  ReverbPreset,
  SlowedReverbPreset,
  StatusEvent,
} from "expo-sonic-ios-player";
import { IPlayerStore, Track } from "./types";

export const usePlayerStore = create<IPlayerStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,

    currentTrack: null,
    currentIndex: -1,

    queue: [],
    originalQueue: [],
    history: [],

    isShuffled: false,
    repeatMode: "off",
    volume: 1.0,

    equalizerPreset: "flat",
    customEQGains: Array(10).fill(0),
    reverbPreset: "smallroom",
    reverbWetDryMix: 0,
    distortionPreset: "drumsbitterbuzz",
    distortionWetDryMix: 0,
    delayTime: 0,
    delayFeedback: 0,
    delayWetDryMix: 0,

    isSlowedReverbEnabled: false,
    slowedReverbPreset: "classic",
    customSlowedReverb: {
      speed: 1.0,
      pitch: 0,
      reverbAmount: 0,
    },

    isMinimized: false,
    showQueue: false,
    showEqualizer: false,
    isAmbientMode: false,

    // Actions
    initialize: async () => {
      try {
        await RNExpoSonicPlayerModule.initialize({
          enableRemoteControls: true,
          skipForwardSeconds: 15,
          skipBackwardSeconds: 15,
          enableNextTrack: true,
          enablePreviousTrack: true,
        });

        // Setup event listeners
        RNExpoSonicPlayerModule.addListener(
          "onPlaybackInfo",
          (info: PlaybackInfoEvent) => {
            get().updatePlaybackInfo(info);
          }
        );

        RNExpoSonicPlayerModule.addListener(
          "onStatusChange",
          (status: StatusEvent) => {
            get().updateStatus(status);
          }
        );

        RNExpoSonicPlayerModule.addListener(
          "onMediaControlEvent",
          (event: any) => {
            const { event: eventType } = event;
            switch (eventType) {
              case "onSkipToNext":
                get().playNext();
                break;
              case "onSkipToPrevious":
                get().playPrevious();
                break;
            }
          }
        );

        console.log("✅ Player store initialized");
      } catch (error) {
        console.error("❌ Failed to initialize player store:", error);
      }
    },

    play: async (track?: Track, index?: number) => {
      const state = get();

      if (track) {
        const trackIndex =
          index ?? state.queue.findIndex((t) => t.id === track.id);

        set({
          currentTrack: track,
          currentIndex: trackIndex,
          isLoading: true,
        });

        try {
          const playOptions: AudioPlaybackOptions = {
            url: track.url,
            title: track.title,
            artist: track.artist,
            artwork: track.artwork,
            duration: track.duration,
            album: track.album,
            description: track.description,
            isLive: track.isLive || false,
            // ✅ FIX: Use track-specific spatial audio setting
            useSpatialAudio: track.useSpatialAudio ?? false,
          };

          await RNExpoSonicPlayerModule.play(playOptions);

          // Add to history if not already there
          const newHistory = [
            track,
            ...state.history.filter((h) => h.id !== track.id),
          ].slice(0, 50);
          set({ history: newHistory });
        } catch (error) {
          console.error("❌ Failed to play track:", error);
          set({ isLoading: false });
        }
      } else if (state.currentTrack) {
        // Resume current track
        await RNExpoSonicPlayerModule.resume();
      }
    },

    pause: async () => {
      await RNExpoSonicPlayerModule.pause();
    },

    resume: async () => {
      await RNExpoSonicPlayerModule.resume();
    },

    stop: async () => {
      await RNExpoSonicPlayerModule.stop();
      set({
        currentTrack: null,
        currentIndex: -1,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
      });
    },

    seek: async (seconds: number) => {
      await RNExpoSonicPlayerModule.seek(seconds);
    },

    setQueue: (tracks: Track[], startIndex = 0) => {
      set({
        queue: tracks,
        originalQueue: [...tracks],
        currentIndex: startIndex,
      });
    },

    addToQueue: (track: Track) => {
      const state = get();
      set({
        queue: [...state.queue, track],
        originalQueue: [...state.originalQueue, track],
      });
    },

    addToQueueNext: (track: Track) => {
      const state = get();
      const nextIndex = state.currentIndex + 1;
      const newQueue = [...state.queue];
      newQueue.splice(nextIndex, 0, track);

      set({
        queue: newQueue,
        originalQueue: [...state.originalQueue, track],
      });
    },

    removeFromQueue: (index: number) => {
      const state = get();
      const newQueue = state.queue.filter((_, i) => i !== index);
      const removedTrack = state.queue[index];

      set({
        queue: newQueue,
        originalQueue: state.originalQueue.filter(
          (t) => t.id !== removedTrack?.id
        ),
        currentIndex:
          index < state.currentIndex
            ? state.currentIndex - 1
            : state.currentIndex,
      });
    },

    clearQueue: () => {
      set({
        queue: [],
        originalQueue: [],
        currentIndex: -1,
      });
    },

    moveQueueItem: (fromIndex: number, toIndex: number) => {
      const state = get();
      const newQueue = [...state.queue];
      const [movedItem] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedItem);

      // Update current index if necessary
      let newCurrentIndex = state.currentIndex;
      if (fromIndex === state.currentIndex) {
        newCurrentIndex = toIndex;
      } else if (
        fromIndex < state.currentIndex &&
        toIndex >= state.currentIndex
      ) {
        newCurrentIndex = state.currentIndex - 1;
      } else if (
        fromIndex > state.currentIndex &&
        toIndex <= state.currentIndex
      ) {
        newCurrentIndex = state.currentIndex + 1;
      }

      set({
        queue: newQueue,
        currentIndex: newCurrentIndex,
      });
    },

    playNext: async () => {
      const state = get();

      if (state.repeatMode === "one" && state.currentTrack) {
        // Repeat current track
        await get().play(state.currentTrack, state.currentIndex);
        return;
      }

      let nextIndex = state.currentIndex + 1;

      if (nextIndex >= state.queue.length) {
        if (state.repeatMode === "all") {
          nextIndex = 0;
        } else {
          // End of queue
          await get().stop();
          return;
        }
      }

      const nextTrack = state.queue[nextIndex];
      if (nextTrack) {
        await get().stop();
        await get().play(nextTrack, nextIndex);
      }
    },

    playPrevious: async () => {
      const state = get();

      // If we're more than 3 seconds into the track, restart it
      if (state.currentTime > 3 && state.currentTrack) {
        await get().seek(0);
        return;
      }

      let prevIndex = state.currentIndex - 1;

      if (prevIndex < 0) {
        if (state.repeatMode === "all") {
          prevIndex = state.queue.length - 1;
        } else {
          // Go to start of current track
          await get().seek(0);
          return;
        }
      }

      const prevTrack = state.queue[prevIndex];
      if (prevTrack) {
        await get().stop();
        await get().play(prevTrack, prevIndex);
      }
    },

    skipToIndex: async (index: number) => {
      const state = get();
      const track = state.queue[index];
      if (track) {
        await get().play(track, index);
      }
    },

    toggleShuffle: () => {
      const state = get();

      if (state.isShuffled) {
        // Unshuffle - restore original order
        const currentTrack = state.currentTrack;
        const newIndex = currentTrack
          ? state.originalQueue.findIndex((t) => t.id === currentTrack.id)
          : -1;

        set({
          queue: [...state.originalQueue],
          currentIndex: newIndex,
          isShuffled: false,
        });
      } else {
        // Shuffle - randomize queue but keep current track at current position
        const shuffledQueue = [...state.queue];
        const currentTrack = shuffledQueue[state.currentIndex];

        // Remove current track temporarily
        if (currentTrack) {
          shuffledQueue.splice(state.currentIndex, 1);
        }

        // Shuffle remaining tracks
        for (let i = shuffledQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledQueue[i], shuffledQueue[j]] = [
            shuffledQueue[j],
            shuffledQueue[i],
          ];
        }

        // Reinsert current track at current position
        if (currentTrack) {
          shuffledQueue.splice(state.currentIndex, 0, currentTrack);
        }

        set({
          queue: shuffledQueue,
          isShuffled: true,
        });
      }
    },

    setRepeatMode: (mode: "off" | "all" | "one") => {
      set({ repeatMode: mode });
    },

    setVolume: (volume: number) => {
      set({ volume: Math.max(0, Math.min(1, volume)) });
    },

    setEqualizerPreset: async (preset: EqualizerPreset) => {
      await RNExpoSonicPlayerModule.applyEqualizerPreset(preset);
      set({ equalizerPreset: preset });
    },

    setBandGain: async (band: number, gain: number) => {
      await RNExpoSonicPlayerModule.setBandGain(band, gain);
      const state = get();
      const newGains = [...state.customEQGains];
      newGains[band] = gain;
      set({ customEQGains: newGains });
    },

    resetEqualizer: async () => {
      await RNExpoSonicPlayerModule.resetEqualizer();
      set({
        customEQGains: Array(10).fill(0),
        equalizerPreset: "flat",
      });
    },

    setReverbPreset: async (preset: ReverbPreset) => {
      await RNExpoSonicPlayerModule.setReverbPreset(preset);
      set({ reverbPreset: preset });
    },

    setReverbWetDryMix: async (mix: number) => {
      await RNExpoSonicPlayerModule.setReverbWetDryMix(mix);
      set({ reverbWetDryMix: mix });
    },

    setDistortionPreset: async (preset: DistortionPreset) => {
      await RNExpoSonicPlayerModule.setDistortionPreset(preset);
      set({ distortionPreset: preset });
    },

    setDistortionWetDryMix: async (mix: number) => {
      await RNExpoSonicPlayerModule.setDistortionWetDryMix(mix);
      set({ distortionWetDryMix: mix });
    },

    setDelayTime: async (time: number) => {
      await RNExpoSonicPlayerModule.setDelayTime(time);
      set({ delayTime: time });
    },

    setDelayFeedback: async (feedback: number) => {
      await RNExpoSonicPlayerModule.setDelayFeedback(feedback);
      set({ delayFeedback: feedback });
    },

    setDelayWetDryMix: async (mix: number) => {
      await RNExpoSonicPlayerModule.setDelayWetDryMix(mix);
      set({ delayWetDryMix: mix });
    },

    applyAudioPreset: async (preset: AudioPreset) => {
      await RNExpoSonicPlayerModule.applyAudioPreset(preset);
      // You might want to update individual effect states here based on preset
    },

    enableSlowedReverb: async () => {
      await RNExpoSonicPlayerModule.enableSlowedReverb();
      set({ isSlowedReverbEnabled: true });
    },

    disableSlowedReverb: async () => {
      await RNExpoSonicPlayerModule.disableSlowedReverb();
      set({ isSlowedReverbEnabled: false });
    },

    toggleSlowedReverb: async () => {
      await RNExpoSonicPlayerModule.toggleSlowedReverb();
      set((state) => ({ isSlowedReverbEnabled: !state.isSlowedReverbEnabled }));
    },

    setSlowedReverbPreset: async (preset: SlowedReverbPreset) => {
      await RNExpoSonicPlayerModule.applySlowedReverbPreset(preset);
      set({ slowedReverbPreset: preset });
    },

    setCustomSlowedReverb: async (
      speed: number,
      pitch: number,
      reverbAmount: number
    ) => {
      await RNExpoSonicPlayerModule.setSlowedReverb(speed, pitch, reverbAmount);
      set({
        customSlowedReverb: { speed, pitch, reverbAmount },
      });
    },

    toggleAmbientMode: async (enabled: boolean) => {
      await RNExpoSonicPlayerModule.toggleAmbientMode(enabled);
      set({ isAmbientMode: enabled });
    },

    setMinimized: (minimized: boolean) => {
      set({ isMinimized: minimized });
    },

    setShowQueue: (show: boolean) => {
      set({ showQueue: show });
    },

    setShowEqualizer: (show: boolean) => {
      set({ showEqualizer: show });
    },

    updatePlaybackInfo: (info: PlaybackInfoEvent) => {
      set({
        currentTime: info.currentTime,
        duration: info.duration,
        isPlaying: info.isPlaying,
        isPaused: !info.isPlaying,
        isLoading: false,
      });
    },

    updateStatus: (status: StatusEvent) => {
      switch (status.status) {
        case "loading":
          set({ isLoading: true });
          break;
        case "ready":
          set({ isLoading: false, isPlaying: true, isPaused: false });
          break;
        case "error":
          set({ isLoading: false, isPlaying: false });
          break;
        case "seeked":
          // Status update for seeking
          break;
      }
    },

    handleTrackEnd: async () => {
      // This will be called when a track ends
      await get().playNext();
    },
  }))
);

export default usePlayerStore;
