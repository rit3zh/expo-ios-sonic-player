import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
} from "react-native";
import Slider from "@react-native-community/slider";
import { SFSymbol, SymbolView } from "expo-symbols";
import RNExpoSonicPlayerModule, {
  useBufferedProgress,
  usePlayer,
  Events,
  PlayBackStatus,
} from "expo-sonic-ios-player";

import { Image as ExpoImage } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  withSequence,
  withRepeat,
} from "react-native-reanimated";

import { Track } from "./store/types";

const { width: screenWidth } = Dimensions.get("window");

// Separate component for EQ Band to avoid hooks in render
const EQBand = ({ label, index, value, onValueChange, animation }: any) => {
  const bandAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor:
      interpolate(animation.value, [0, 1], [0, 0.2]) > 0.1
        ? "#6366f1"
        : "#27272a",
  }));

  return (
    <Animated.View style={[styles.bandContainer]}>
      <Text style={styles.bandLabel}>{label}</Text>
      <View style={styles.sliderWrapper}>
        <Slider
          style={styles.slider}
          value={value}
          minimumValue={-12}
          maximumValue={12}
          step={0.5}
          onValueChange={(newValue) => onValueChange(index, newValue)}
          minimumTrackTintColor="#6366f1"
          maximumTrackTintColor="#3f3f46"
          thumbTintColor="#6366f1"
        />
      </View>
      <Text style={styles.gainValue}>{value.toFixed(1)}</Text>
    </Animated.View>
  );
};

export const tracks: Track[] = [
  {
    artist: "Gamma Skies",
    id: "gamma-skies",
    title: "Season Of love",
    artwork: "https://i.scdn.co/image/ab67616d0000b273d053bf97e620587303ad7b78",
    url: Image.resolveAssetSource(require("./audio/love.mp3")).uri,
    useSpatialAudio: false,
  },
  {
    artist: "Liam Payne",
    title: "Strip That Down",
    id: "liam-payne-strip-that-down",
    artwork: "https://i.scdn.co/image/ab67616d00001e02bb19faf82c27f392e29c7300",
    url: Image.resolveAssetSource(require("./audio/liam-payne.mp3")).uri,
  },
];

export default function AudioPlayerExample() {
  const { bufferProgress, status } = useBufferedProgress();
  const [activeTab, setActiveTab] = useState<
    "player" | "equalizer" | "effects" | "presets"
  >("player");
  const [bandGains, setBandGains] = useState<number[]>(Array(10).fill(0));
  const [reverbWetDryMix, setReverbWetDryMix] = useState(0);
  const [delayTime, setDelayTime] = useState(0);
  const [delayFeedback, setDelayFeedback] = useState(0);
  const [delayWetDryMix, setDelayWetDryMix] = useState(0);
  const [distortionWetDryMix, setDistortionWetDryMix] = useState(0);

  // Slowed Reverb Controls
  const [slowedReverbSpeed, setSlowedReverbSpeed] = useState(1.0);
  const [slowedReverbPitch, setSlowedReverbPitch] = useState(0);
  const [slowedReverbAmount, setSlowedReverbAmount] = useState(0);
  const [isSlowedReverbEnabled, setIsSlowedReverbEnabled] = useState(false);

  const [selectedEQPreset, setSelectedEQPreset] = useState("flat");
  const [selectedReverbPreset, setSelectedReverbPreset] = useState("smallroom");
  const [selectedAudioCategory, setSelectedAudioCategory] =
    useState("playback");
  const [isSeekingManually, setIsSeekingManually] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  // Animation values
  const playButtonScale = useSharedValue(1);
  const playButtonRotation = useSharedValue(0);
  const tabIndicatorPosition = useSharedValue(0);
  const slowedReverbCardScale = useSharedValue(1);
  const slowedReverbToggleScale = useSharedValue(1);
  const eqBandAnimations = Array(10)
    .fill(0)
    .map(() => useSharedValue(0));
  const progressAnimation = useSharedValue(0);
  const waveAnimation = useSharedValue(0);

  const {
    currentTime,
    duration,
    isPlaying,
    progress,
    remainingTime,
    status: _status,
  } = usePlayer();

  useEffect(() => {
    const subscription = RNExpoSonicPlayerModule.addListener(
      "onMediaControlEvent",
      (event) => {
        console.log("Media Control Event:", event);
      }
    );

    return () => subscription.remove();
  }, []);

  // Wave animation for playing state
  useEffect(() => {
    if (isPlaying) {
      waveAnimation.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        true
      );
    } else {
      waveAnimation.value = withTiming(0, { duration: 300 });
    }
  }, [isPlaying]);

  // Progress animation
  useEffect(() => {
    progressAnimation.value = withTiming(progress, { duration: 500 });
  }, [progress]);

  // Tab animation
  useEffect(() => {
    const tabIndex = ["player", "equalizer", "effects", "presets"].indexOf(
      activeTab
    );
    tabIndicatorPosition.value = withSpring(
      (tabIndex * (screenWidth - 40)) / 4,
      {
        damping: 15,
        stiffness: 150,
      }
    );
  }, [activeTab]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const animatePlayButton = () => {
    playButtonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    playButtonRotation.value = withTiming(playButtonRotation.value + 360, {
      duration: 300,
    });
  };

  const playAudio = () => {
    animatePlayButton();
    RNExpoSonicPlayerModule.play(tracks[0]);
    setHasPlayedOnce(true);
  };

  const pauseAudio = () => {
    animatePlayButton();
    RNExpoSonicPlayerModule.pause();
  };

  const resumeAudio = () => {
    animatePlayButton();
    RNExpoSonicPlayerModule.resume();
  };

  const stopAudio = () => {
    RNExpoSonicPlayerModule.stop();
    setHasPlayedOnce(false);
  };

  const seekToPosition = (position: number) => {
    RNExpoSonicPlayerModule.seek(position);
  };

  const skipForward = () => {
    const newPosition = Math.min(currentTime + 10, duration);
    seekToPosition(newPosition);
  };

  const skipBackward = () => {
    const newPosition = Math.max(currentTime - 10, 0);
    seekToPosition(newPosition);
  };

  const onSeekComplete = (value: number) => {
    setIsSeekingManually(false);
    seekToPosition(value);
  };

  const onBandPress = async () => {
    try {
      const bands = await RNExpoSonicPlayerModule.getAllBandGains();
      Alert.alert("Total Bands", `${bands}`);
      setBandGains(bands);

      // Animate EQ bands
      bands.forEach((_, index) => {
        eqBandAnimations[index].value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 100 })
        );
      });
    } catch (error) {
      console.error("Error getting band gains:", error);
    }
  };

  const handleBandGainChange = (index: number, value: number) => {
    const newBandGains = [...bandGains];
    newBandGains[index] = value;
    setBandGains(newBandGains);
    RNExpoSonicPlayerModule.setBandGain(index, value);

    // Animate the specific band
    eqBandAnimations[index].value = withSequence(
      withTiming(1, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const applyEQPreset = (preset: string) => {
    setSelectedEQPreset(preset);
    RNExpoSonicPlayerModule.applyEqualizerPreset(preset as any);
    setTimeout(() => {
      onBandPress();
    }, 100);
  };

  const resetEqualizer = () => {
    RNExpoSonicPlayerModule.resetEqualizer();
    setBandGains(Array(10).fill(0));
    setSelectedEQPreset("flat");

    // Animate all bands
    eqBandAnimations.forEach((animation) => {
      animation.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
    });
  };

  const handleReverbChange = (value: number) => {
    setReverbWetDryMix(value);
    RNExpoSonicPlayerModule.setReverbWetDryMix(value);
  };

  const handleReverbPresetChange = (preset: string) => {
    setSelectedReverbPreset(preset);
    RNExpoSonicPlayerModule.setReverbPreset(preset as any);
  };

  // Slowed Reverb Handlers with animations
  const handleSlowedReverbSpeedChange = (value: number) => {
    setSlowedReverbSpeed(value);
    RNExpoSonicPlayerModule.setSlowedReverb(
      value,
      slowedReverbPitch,
      slowedReverbAmount
    );
    slowedReverbCardScale.value = withSequence(
      withTiming(1.02, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
  };

  const handleSlowedReverbPitchChange = (value: number) => {
    setSlowedReverbPitch(value);
    RNExpoSonicPlayerModule.setSlowedReverb(
      slowedReverbSpeed,
      value,
      slowedReverbAmount
    );
    slowedReverbCardScale.value = withSequence(
      withTiming(1.02, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
  };

  const handleSlowedReverbAmountChange = (value: number) => {
    setSlowedReverbAmount(value);
    RNExpoSonicPlayerModule.setSlowedReverb(
      slowedReverbSpeed,
      slowedReverbPitch,
      value
    );
    slowedReverbCardScale.value = withSequence(
      withTiming(1.02, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
  };

  const toggleSlowedReverb = () => {
    const newState = !isSlowedReverbEnabled;
    setIsSlowedReverbEnabled(newState);

    slowedReverbToggleScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    if (newState) {
      RNExpoSonicPlayerModule.setSlowedReverb(
        slowedReverbSpeed,
        slowedReverbPitch,
        slowedReverbAmount
      );
    } else {
      RNExpoSonicPlayerModule.setSlowedReverb(1.0, 0, 0);
    }
  };

  const resetSlowedReverb = () => {
    setSlowedReverbSpeed(1.0);
    setSlowedReverbPitch(0);
    setSlowedReverbAmount(0);
    setIsSlowedReverbEnabled(false);
    RNExpoSonicPlayerModule.setSlowedReverb(1.0, 0, 0);

    slowedReverbCardScale.value = withSequence(
      withTiming(0.98, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
  };

  const handleDelayTimeChange = (value: number) => {
    setDelayTime(value);
    RNExpoSonicPlayerModule.setDelayTime(value);
  };

  const handleDelayFeedbackChange = (value: number) => {
    setDelayFeedback(value);
    RNExpoSonicPlayerModule.setDelayFeedback(value);
  };

  const handleDelayWetDryMixChange = (value: number) => {
    setDelayWetDryMix(value);
    RNExpoSonicPlayerModule.setDelayWetDryMix(value);
  };

  const handleDistortionChange = (value: number) => {
    setDistortionWetDryMix(value);
    RNExpoSonicPlayerModule.setDistortionWetDryMix(value);
  };

  const applyAudioPreset = async (preset: string) => {
    if (preset === "spatial") {
      await RNExpoSonicPlayerModule.enableSpatialAudio(true);
    } else if (preset === "slowed-reverb") {
      setSlowedReverbSpeed(0.8);
      setSlowedReverbPitch(-2);
      setSlowedReverbAmount(30);
      setIsSlowedReverbEnabled(true);
      RNExpoSonicPlayerModule.setSlowedReverb(0.8, -2, 30);
      Alert.alert("Slowed Reverb", "Slowed reverb preset applied!");

      slowedReverbCardScale.value = withSequence(
        withTiming(1.05, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );
    } else {
      RNExpoSonicPlayerModule.applyAudioPreset(preset as any);
      Alert.alert(
        "Preset Applied",
        `${preset} preset has been applied to the audio.`
      );
      setTimeout(() => {
        onBandPress();
      }, 100);
    }
  };

  const handleAudioCategoryChange = async (category: string) => {
    setSelectedAudioCategory(category);
    await RNExpoSonicPlayerModule.toggleAmbientMode(category === "ambient");
  };

  const onMetaDataPress = async () => {
    await RNExpoSonicPlayerModule.setMetaDataForCurrentTrack({
      title: "Next Summer",
      artist: "Damiano David",
      artworkUri:
        "https://i.scdn.co/image/ab67616d0000b2730c471c36970b9406233842a5",
      duration: 195,
    });
    alert("meta data set");
  };

  // Animated styles
  const playButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: playButtonScale.value },
      { rotate: `${playButtonRotation.value}deg` },
    ],
  }));

  const tabIndicatorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorPosition.value }],
  }));

  const slowedReverbCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: slowedReverbCardScale.value }],
  }));

  const slowedReverbToggleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: slowedReverbToggleScale.value }],
  }));

  const waveAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(waveAnimation.value, [0, 1], [1, 1.1]);
    const opacity = interpolate(waveAnimation.value, [0, 1], [0.3, 0.8]);

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressAnimation.value * 100}%`,
  }));

  const bandLabels = [
    "32Hz",
    "64Hz",
    "125Hz",
    "250Hz",
    "500Hz",
    "1kHz",
    "2kHz",
    "4kHz",
    "8kHz",
    "16kHz",
  ];

  const equalizerPresets = [
    "flat",
    "rock",
    "pop",
    "jazz",
    "classical",
    "bass",
    "treble",
    "vocal",
  ];

  const reverbPresets = [
    "smallroom",
    "mediumroom",
    "largeroom",
    "mediumhall",
    "largehall",
    "plate",
    "cathedral",
  ];

  const audioPresets = [
    { name: "normal", icon: "music.note", desc: "Clean, balanced sound" },
    {
      name: "concert",
      icon: "megaphone",
      desc: "Spacious with reverb and slight delay",
    },
    {
      name: "slowed-reverb",
      icon: "water.waves",
      desc: "Slowed down with reverb and delay",
    },
    { name: "studio", icon: "mic", desc: "Intimate vocal-focused sound" },
  ];

  const audioCategories = [
    {
      name: "playback",
      icon: "speaker.2",
      desc: "Standard playback mode",
      title: "Playback",
    },
    {
      name: "ambient",
      icon: "speaker.wave.1",
      desc: "Mix with other audio sources",
      title: "Ambient",
    },
  ];

  const getTabIcon = (tabName: string) => {
    switch (tabName) {
      case "player":
        return "play.circle";
      case "equalizer":
        return "slider.horizontal.3";
      case "effects":
        return "waveform.and.magnifyingglass";
      case "presets":
        return "star.circle";
      default:
        return "circle";
    }
  };

  const renderTabButton = (tabName: string, label: string, index: number) => (
    <TouchableOpacity
      key={tabName}
      style={[styles.tabButton]}
      onPress={() => setActiveTab(tabName as any)}
    >
      <SymbolView
        name={getTabIcon(tabName)}
        size={20}
        type="hierarchical"
        tintColor={activeTab === tabName ? "#6366f1" : "#71717a"}
      />
      <Text
        style={[
          styles.tabButtonText,
          activeTab === tabName && styles.activeTabButtonText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderControlButton = (
    icon: SFSymbol,
    label: string,
    onPress: () => void,
    variant: "primary" | "secondary" = "secondary"
  ) => (
    <TouchableOpacity
      style={[
        styles.controlButton,
        variant === "primary" && styles.primaryControlButton,
      ]}
      onPress={onPress}
    >
      <SymbolView
        name={icon as any}
        size={24}
        type="hierarchical"
        tintColor={variant === "primary" ? "#ffffff" : "#f4f4f5"}
      />
      <Text
        style={[
          styles.controlButtonText,
          variant === "primary" && styles.primaryControlButtonText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderPresetChip = (
    preset: string,
    onPress: () => void,
    isSelected: boolean = false,
    index: number
  ) => (
    <TouchableOpacity
      style={[styles.presetChip, isSelected && styles.selectedPresetChip]}
      onPress={onPress}
      key={index.toString()}
    >
      <Text
        style={[
          styles.presetChipText,
          isSelected && styles.selectedPresetChipText,
        ]}
      >
        {preset}
      </Text>
    </TouchableOpacity>
  );

  const renderAudioCategoryCard = (category: any) => (
    <TouchableOpacity
      key={category.name}
      style={[
        styles.audioCategoryCard,
        selectedAudioCategory === category.name &&
          styles.selectedAudioCategoryCard,
      ]}
      onPress={() => handleAudioCategoryChange(category.name)}
    >
      <View style={styles.categoryCardHeader}>
        <SymbolView
          name={category.icon}
          size={24}
          type="hierarchical"
          tintColor={
            selectedAudioCategory === category.name ? "#ffffff" : "#f4f4f5"
          }
        />
        <Text
          style={[
            styles.audioCategoryTitle,
            selectedAudioCategory === category.name &&
              styles.selectedAudioCategoryTitle,
          ]}
        >
          {category.title}
        </Text>
      </View>
      <Text
        style={[
          styles.audioCategoryDescription,
          selectedAudioCategory === category.name &&
            styles.selectedAudioCategoryDescription,
        ]}
      >
        {category.desc}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header} />

        {/* Animated Tab Container */}
        <View style={styles.tabContainer}>
          <Animated.View
            style={[styles.tabIndicator, tabIndicatorAnimatedStyle]}
          />
          {["player", "equalizer", "effects", "presets"].map((tab, index) =>
            renderTabButton(
              tab,
              tab.charAt(0).toUpperCase() + tab.slice(1),
              index
            )
          )}
        </View>

        {activeTab === "player" && (
          <View style={styles.tabContent}>
            <Animated.View style={[styles.nowPlayingCard, waveAnimatedStyle]}>
              <View style={styles.trackInfo}>
                <View style={styles.albumArt}>
                  <ExpoImage
                    source={{ uri: tracks[0].artwork }}
                    style={styles.albumArtImage}
                  />
                </View>
                <View style={styles.trackDetails}>
                  <Text style={styles.trackTitle}>{tracks[0].title}</Text>
                  <Text style={styles.trackArtist}>{tracks[0].artist}</Text>
                </View>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                  <Text style={styles.timeText}>
                    {formatTime(remainingTime)}
                  </Text>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressTrack}>
                    <Animated.View
                      style={[styles.progressFill, progressAnimatedStyle]}
                    />
                  </View>
                  <Slider
                    style={styles.progressSlider}
                    value={isSeekingManually ? undefined : currentTime}
                    minimumValue={0}
                    maximumValue={duration || 1}
                    onSlidingComplete={onSeekComplete}
                    minimumTrackTintColor="transparent"
                    maximumTrackTintColor="transparent"
                    thumbTintColor="#6366f1"
                    disabled={!duration}
                  />
                </View>

                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    Progress: {(progress * 100).toFixed(1)}%
                  </Text>
                  <Text style={styles.progressText}>
                    Duration: {formatTime(duration)}
                  </Text>
                </View>
              </View>

              <View style={styles.mainControls}>
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={skipBackward}
                >
                  <SymbolView
                    name="gobackward.10"
                    size={24}
                    type="hierarchical"
                    tintColor="#f4f4f5"
                  />
                </TouchableOpacity>

                <Animated.View style={playButtonAnimatedStyle}>
                  <TouchableOpacity
                    style={styles.playPauseButton}
                    onPress={() => {
                      if (isPlaying) {
                        pauseAudio();
                      } else if (hasPlayedOnce) {
                        resumeAudio();
                      } else {
                        playAudio();
                      }
                    }}
                  >
                    <SymbolView
                      name={isPlaying ? "pause.fill" : "play.fill"}
                      size={32}
                      type="hierarchical"
                      tintColor="#ffffff"
                    />
                  </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={skipForward}
                >
                  <SymbolView
                    name="goforward.10"
                    size={24}
                    type="hierarchical"
                    tintColor="#f4f4f5"
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>

            <View style={styles.additionalControls}>
              <Text style={styles.sectionTitle}>Audio Session Category</Text>
              <Text style={styles.labelText}>
                Select the audio session category for playback behavior
              </Text>
              <View style={styles.categoryGrid}>
                {audioCategories.map(renderAudioCategoryCard)}
              </View>
            </View>

            <View style={styles.additionalControls}>
              <Text style={styles.sectionTitle}>Additional Controls</Text>
              <View style={styles.controlGrid}>
                {renderControlButton("stop.fill", "Stop", stopAudio)}
                {renderControlButton("chart.bar", "Get Bands", onBandPress)}
              </View>
            </View>
            {renderControlButton("mediastick", "Set Metadata", onMetaDataPress)}
          </View>
        )}

        {activeTab === "equalizer" && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Equalizer</Text>
              <TouchableOpacity
                onPress={resetEqualizer}
                style={styles.resetButton}
              >
                <SymbolView
                  name="arrow.clockwise"
                  size={16}
                  type="hierarchical"
                  tintColor="#71717a"
                />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.presetSection}>
              <Text style={styles.labelText}>Presets</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.presetScroll}
              >
                {equalizerPresets.map((preset, index) =>
                  renderPresetChip(
                    preset,
                    () => applyEQPreset(preset),
                    selectedEQPreset === preset,
                    index
                  )
                )}
              </ScrollView>
            </View>

            <Text style={styles.labelText}>Manual Controls</Text>
            <View style={styles.eqContainer}>
              {bandLabels.map((label, index) => (
                <EQBand
                  key={index.toString()}
                  label={label}
                  index={index}
                  value={bandGains[index] || 0}
                  onValueChange={handleBandGainChange}
                  animation={eqBandAnimations[index]}
                />
              ))}
            </View>
          </View>
        )}

        {activeTab === "effects" && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Audio Effects</Text>

            {/* Animated Slowed Reverb Card */}
            <Animated.View
              style={[
                styles.effectCard,
                styles.slowedReverbCard,
                slowedReverbCardAnimatedStyle,
              ]}
            >
              <View style={styles.effectHeader}>
                <View style={styles.effectTitleContainer}>
                  <SymbolView
                    name="water.waves"
                    size={24}
                    type="hierarchical"
                    tintColor="#8b5cf6"
                  />
                  <Text style={styles.effectTitle}>Slowed Reverb</Text>
                </View>
                <View style={styles.effectControls}>
                  <TouchableOpacity
                    style={styles.resetEffectButton}
                    onPress={resetSlowedReverb}
                  >
                    <SymbolView
                      name="arrow.clockwise"
                      size={16}
                      type="hierarchical"
                      tintColor="#71717a"
                    />
                  </TouchableOpacity>
                  <Animated.View style={slowedReverbToggleAnimatedStyle}>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        isSlowedReverbEnabled && styles.toggleButtonActive,
                      ]}
                      onPress={toggleSlowedReverb}
                    >
                      <SymbolView
                        name={isSlowedReverbEnabled ? "checkmark" : "xmark"}
                        size={16}
                        type="hierarchical"
                        tintColor={
                          isSlowedReverbEnabled ? "#ffffff" : "#71717a"
                        }
                      />
                      <Text
                        style={[
                          styles.toggleButtonText,
                          isSlowedReverbEnabled &&
                            styles.toggleButtonTextActive,
                        ]}
                      >
                        {isSlowedReverbEnabled ? "ON" : "OFF"}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>

              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Speed</Text>
                <Text style={[styles.sliderValue, styles.speedValue]}>
                  {slowedReverbSpeed.toFixed(2)}x
                </Text>
              </View>
              <Slider
                style={styles.effectSlider}
                value={slowedReverbSpeed}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.01}
                onValueChange={handleSlowedReverbSpeedChange}
                minimumTrackTintColor="#8b5cf6"
                maximumTrackTintColor="#3f3f46"
                thumbTintColor="#8b5cf6"
              />

              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Pitch</Text>
                <Text style={[styles.sliderValue, styles.pitchValue]}>
                  {slowedReverbPitch > 0 ? "+" : ""}
                  {slowedReverbPitch.toFixed(1)} semitones
                </Text>
              </View>
              <Slider
                style={styles.effectSlider}
                value={slowedReverbPitch}
                minimumValue={-12}
                maximumValue={12}
                step={0.1}
                onValueChange={handleSlowedReverbPitchChange}
                minimumTrackTintColor="#8b5cf6"
                maximumTrackTintColor="#3f3f46"
                thumbTintColor="#8b5cf6"
              />

              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Reverb Amount</Text>
                <Text style={[styles.sliderValue, styles.reverbValue]}>
                  {slowedReverbAmount.toFixed(0)}%
                </Text>
              </View>
              <Slider
                style={styles.effectSlider}
                value={slowedReverbAmount}
                minimumValue={0}
                maximumValue={100}
                step={1}
                onValueChange={handleSlowedReverbAmountChange}
                minimumTrackTintColor="#8b5cf6"
                maximumTrackTintColor="#3f3f46"
                thumbTintColor="#8b5cf6"
              />
            </Animated.View>

            <View style={styles.effectCard}>
              <View style={styles.effectHeader}>
                <View style={styles.effectTitleContainer}>
                  <SymbolView
                    name="waveform.path"
                    size={20}
                    type="hierarchical"
                    tintColor="#f4f4f5"
                  />
                  <Text style={styles.effectTitle}>Reverb</Text>
                </View>
              </View>

              <Text style={styles.labelText}>Presets</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.presetScroll}
              >
                {reverbPresets.map((preset, index) =>
                  renderPresetChip(
                    preset,
                    () => handleReverbPresetChange(preset),
                    selectedReverbPreset === preset,
                    index
                  )
                )}
              </ScrollView>

              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Wet/Dry Mix</Text>
                <Text style={styles.sliderValue}>
                  {reverbWetDryMix.toFixed(0)}%
                </Text>
              </View>
              <Slider
                style={styles.effectSlider}
                value={reverbWetDryMix}
                minimumValue={0}
                maximumValue={100}
                step={1}
                onValueChange={handleReverbChange}
                minimumTrackTintColor="#6366f1"
                maximumTrackTintColor="#3f3f46"
                thumbTintColor="#6366f1"
              />
            </View>

            <View style={styles.effectCard}>
              <View style={styles.effectHeader}>
                <View style={styles.effectTitleContainer}>
                  <SymbolView
                    name="clock"
                    size={20}
                    type="hierarchical"
                    tintColor="#f4f4f5"
                  />
                  <Text style={styles.effectTitle}>Delay</Text>
                </View>
              </View>

              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Time</Text>
                <Text style={styles.sliderValue}>{delayTime.toFixed(2)}s</Text>
              </View>
              <Slider
                style={styles.effectSlider}
                value={delayTime}
                minimumValue={0}
                maximumValue={2}
                step={0.01}
                onValueChange={handleDelayTimeChange}
                minimumTrackTintColor="#6366f1"
                maximumTrackTintColor="#3f3f46"
                thumbTintColor="#6366f1"
              />

              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Feedback</Text>
                <Text style={styles.sliderValue}>
                  {delayFeedback.toFixed(0)}%
                </Text>
              </View>
              <Slider
                style={styles.effectSlider}
                value={delayFeedback}
                minimumValue={0}
                maximumValue={100}
                step={1}
                onValueChange={handleDelayFeedbackChange}
                minimumTrackTintColor="#6366f1"
                maximumTrackTintColor="#3f3f46"
                thumbTintColor="#6366f1"
              />

              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Wet/Dry Mix</Text>
                <Text style={styles.sliderValue}>
                  {delayWetDryMix.toFixed(0)}%
                </Text>
              </View>
              <Slider
                style={styles.effectSlider}
                value={delayWetDryMix}
                minimumValue={0}
                maximumValue={100}
                step={1}
                onValueChange={handleDelayWetDryMixChange}
                minimumTrackTintColor="#6366f1"
                maximumTrackTintColor="#3f3f46"
                thumbTintColor="#6366f1"
              />
            </View>

            <View style={styles.effectCard}>
              <View style={styles.effectHeader}>
                <View style={styles.effectTitleContainer}>
                  <SymbolView
                    name="bolt.fill"
                    size={20}
                    type="hierarchical"
                    tintColor="#f4f4f5"
                  />
                  <Text style={styles.effectTitle}>Distortion</Text>
                </View>
              </View>

              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Wet/Dry Mix</Text>
                <Text style={styles.sliderValue}>
                  {distortionWetDryMix.toFixed(0)}%
                </Text>
              </View>
              <Slider
                style={styles.effectSlider}
                value={distortionWetDryMix}
                minimumValue={0}
                maximumValue={100}
                step={1}
                onValueChange={handleDistortionChange}
                minimumTrackTintColor="#6366f1"
                maximumTrackTintColor="#3f3f46"
                thumbTintColor="#6366f1"
              />
            </View>
          </View>
        )}

        {activeTab === "presets" && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Audio Presets</Text>
            <Text style={styles.labelText}>
              Complete audio presets with EQ + Effects
            </Text>

            <View style={styles.presetGrid}>
              {audioPresets.map((preset, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.audioPresetCard}
                  onPress={() => applyAudioPreset(preset.name)}
                >
                  <View style={styles.presetCardHeader}>
                    <SymbolView
                      name={preset.icon as any}
                      size={24}
                      type="hierarchical"
                      tintColor="#6366f1"
                    />
                    <Text style={styles.audioPresetTitle}>
                      {preset.name.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.audioPresetDescription}>
                    {preset.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 6,
    position: "relative",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  tabIndicator: {
    position: "absolute",
    top: 6,
    left: 6,
    width: (screenWidth - 52) / 4,
    height: 44,
    backgroundColor: "#6366f1",
    borderRadius: 12,
    zIndex: 0,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    zIndex: 1,
  },
  tabButtonText: {
    color: "#71717a",
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabButtonText: {
    color: "#ffffff",
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  nowPlayingCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  trackInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  albumArt: {
    width: 70,
    height: 70,
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  albumArtImage: {
    width: 70,
    height: 70,
    borderRadius: 16,
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  trackArtist: {
    color: "#a1a1aa",
    fontSize: 16,
    fontWeight: "500",
  },
  progressSection: {
    marginBottom: 28,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  timeText: {
    color: "#d1d5db",
    fontSize: 15,
    fontWeight: "600",
  },
  progressContainer: {
    marginBottom: 16,
    position: "relative",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#2a2a2a",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6366f1",
    borderRadius: 3,
  },
  progressSlider: {
    position: "absolute",
    top: -17,
    left: 0,
    right: 0,
    height: 40,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: "500",
  },
  mainControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
  },
  skipButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  additionalControls: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  labelText: {
    color: "#a1a1aa",
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 20,
  },
  categoryGrid: {
    gap: 16,
  },
  audioCategoryCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#3a3a3a",
  },
  selectedAudioCategoryCard: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  categoryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  audioCategoryTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  selectedAudioCategoryTitle: {
    color: "#ffffff",
  },
  audioCategoryDescription: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "500",
  },
  selectedAudioCategoryDescription: {
    color: "#e5e7eb",
  },
  controlGrid: {
    flexDirection: "row",
    gap: 16,
  },
  controlButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2a2a2a",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  primaryControlButton: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  controlButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  primaryControlButtonText: {
    color: "#ffffff",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  resetButtonText: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "600",
  },
  presetSection: {
    marginBottom: 28,
  },
  presetScroll: {
    marginBottom: 8,
  },
  presetChip: {
    backgroundColor: "#2a2a2a",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  selectedPresetChip: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  presetChipText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  selectedPresetChipText: {
    color: "#ffffff",
  },
  eqContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 24,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  bandContainer: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 3,
    borderRadius: 12,
    paddingVertical: 12,
  },
  bandLabel: {
    color: "#d1d5db",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  sliderWrapper: {
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  slider: {
    width: 140,
    height: 40,
    transform: [{ rotate: "-90deg" }],
  },
  gainValue: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    minWidth: 36,
  },
  effectCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  slowedReverbCard: {
    borderColor: "#8b5cf6",
    backgroundColor: "rgba(139, 92, 246, 0.08)",
  },
  effectHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  effectTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  effectTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  effectControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  resetEffectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  toggleButtonActive: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  toggleButtonText: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "700",
  },
  toggleButtonTextActive: {
    color: "#ffffff",
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 20,
  },
  sliderLabel: {
    color: "#d1d5db",
    fontSize: 15,
    fontWeight: "600",
  },
  sliderValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  speedValue: {
    color: "#8b5cf6",
  },
  pitchValue: {
    color: "#8b5cf6",
  },
  reverbValue: {
    color: "#8b5cf6",
  },
  effectSlider: {
    height: 44,
    marginBottom: 12,
  },
  presetGrid: {
    gap: 20,
    marginTop: 20,
  },
  audioPresetCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: "#2a2a2a",
  },
  presetCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 16,
  },
  audioPresetTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  audioPresetDescription: {
    color: "#a1a1aa",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
});
