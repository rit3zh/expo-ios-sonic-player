import React, { JSX, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Animated,
} from "react-native";
import usePlayerStore from "./store";
import { Track } from "./store/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const tracks: Track[] = [
  {
    artist: "Gamma Skies",
    id: "gamma-skies",
    title: "Season Of love",
    artwork: "https://i.scdn.co/image/ab67616d0000b273d053bf97e620587303ad7b78",
    url: Image.resolveAssetSource(require("./audio/love.mp3")).uri,
  },
  {
    artist: "Liam Payne",
    title: "Strip That Down",
    id: "liam-payne-strip-that-down",
    artwork: "https://i.scdn.co/image/ab67616d00001e02bb19faf82c27f392e29c7300",
    url: Image.resolveAssetSource(require("./audio/liam-payne.mp3")).uri,
  },
];

export default function App(): JSX.Element {
  const store = usePlayerStore();

  // Animation values using React Native's Animated API
  const albumRotation = useRef(new Animated.Value(0)).current;
  const playButtonScale = useRef(new Animated.Value(1)).current;
  const waveScale = useRef(new Animated.Value(1)).current;
  const waveOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    store.setQueue(tracks);
  }, []);

  useEffect(() => {
    if (store.isPlaying) {
      // Start album rotation animation
      Animated.loop(
        Animated.timing(albumRotation, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        })
      ).start();

      // Start wave animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveScale, {
            toValue: 1.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(waveScale, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(waveOpacity, {
            toValue: 0.7,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(waveOpacity, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop animations
      albumRotation.stopAnimation();
      waveScale.stopAnimation();
      waveOpacity.stopAnimation();

      // Reset to initial values
      Animated.spring(albumRotation, {
        toValue: 0,
        useNativeDriver: true,
      }).start();

      Animated.spring(waveScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      Animated.spring(waveOpacity, {
        toValue: 0.3,
        useNativeDriver: true,
      }).start();
    }
  }, [store.isPlaying]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    // Animate play button press
    Animated.sequence([
      Animated.timing(playButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(playButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (store.isPlaying && !store.isPaused) {
      store.pause();
    } else {
      store.play(store.queue[0]);
    }
  };

  const titleOfButton =
    store?.queue?.length && !store.isPlaying
      ? "Play"
      : store.isPlaying && store.isPaused
        ? "Resume"
        : "Pause";

  // Create interpolated rotation value
  const rotateInterpolate = albumRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Now Playing</Text>
      </View>

      {/* Album Art Section */}
      <View style={styles.albumSection}>
        <View style={styles.albumContainer}>
          {/* Animated wave background */}
          <Animated.View
            style={[
              styles.waveBackground,
              {
                transform: [{ scale: waveScale }],
                opacity: waveOpacity,
              },
            ]}
          />

          {/* Album art */}
          <Animated.View
            style={[
              styles.albumArt,
              {
                transform: [{ rotate: rotateInterpolate }],
              },
            ]}
          >
            <Image
              source={{ uri: store.currentTrack?.artwork }}
              style={styles.albumImage}
            />
          </Animated.View>
        </View>
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle}>
          {store.currentTrack?.title || "No Track Selected"}
        </Text>
        <Text style={styles.trackArtist}>
          {store.currentTrack?.artist || "Unknown Artist"}
        </Text>
      </View>

      {/* Progress Info */}
      <View style={styles.progressInfo}>
        <Text style={styles.timeText}>{formatTime(store.currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(store.duration)}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${store.duration > 0 ? (store.currentTime / store.duration) * 100 : 0}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => store.playPrevious()}
        >
          <Text style={styles.controlButtonText}>⏮</Text>
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ scale: playButtonScale }] }}>
          <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
            <View style={styles.playButtonContent}>
              <Text style={styles.playButtonText}>
                {store.isPlaying && !store.isPaused ? "⏸" : "▶️"}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => store.playNext()}
        >
          <Text style={styles.controlButtonText}>⏭</Text>
        </TouchableOpacity>
      </View>

      {/* Additional Controls */}
      <View style={styles.additionalControls}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            store.isShuffled && styles.activeToggleButton,
          ]}
          onPress={() => store.toggleShuffle()}
        >
          <Text
            style={[
              styles.toggleButtonText,
              store.isShuffled && styles.activeToggleButtonText,
            ]}
          >
            🔀
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            store.repeatMode !== "off" && styles.activeToggleButton,
          ]}
          onPress={() => {
            const modes: Array<"off" | "all" | "one"> = ["off", "all", "one"];
            const currentIndex = modes.indexOf(store.repeatMode);
            const nextMode = modes[(currentIndex + 1) % modes.length];
            store.setRepeatMode(nextMode);
          }}
        >
          <Text
            style={[
              styles.toggleButtonText,
              store.repeatMode !== "off" && styles.activeToggleButtonText,
            ]}
          >
            {store.repeatMode === "one" ? "🔂" : "🔁"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {store.isPlaying ? "Playing" : "Paused"}
        </Text>
        <Text style={styles.statusText}>
          Queue: {store.queue.length} tracks
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    paddingTop: 50,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
  },
  albumSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  albumContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  waveBackground: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(139, 92, 246, 0.2)",
  },
  albumArt: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  albumImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  trackInfo: {
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  trackTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  trackArtist: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    fontWeight: "500",
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    marginBottom: 10,
  },
  timeText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  progressContainer: {
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#8b5cf6",
    borderRadius: 2,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    gap: 40,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonText: {
    color: "#ffffff",
    fontSize: 20,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
  },
  playButtonContent: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
  },
  playButtonText: {
    color: "#ffffff",
    fontSize: 28,
  },
  additionalControls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 30,
    marginBottom: 30,
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeToggleButton: {
    backgroundColor: "rgba(139, 92, 246, 0.3)",
  },
  toggleButtonText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
  },
  activeToggleButtonText: {
    color: "#8b5cf6",
  },
  statusContainer: {
    alignItems: "center",
    gap: 5,
  },
  statusText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontWeight: "500",
  },
});
