import ExpoModulesCore
import AVFoundation

public class RNExpoSonicPlayer: Module {
    private lazy var audioPlayer: AudioPlayer = {
        let player = AudioPlayer()
        player.onProgress = { [weak self] progress in
            self?.sendEvent("onProgress", ["progress": progress])
        }
        player.onStatusChange = { [weak self] status in
            self?.sendEvent("onStatusChange", ["status": status])
        }
        player.onPlaybackInfo = { [weak self] currentTime, duration, isPlaying in
            self?.sendEvent("onPlaybackInfo", [
                "currentTime": currentTime,
                "duration": duration,
                "isPlaying": isPlaying,
            ])
        }
        
        player.onMediaControlEvent = { [weak self] event, payload in
            self?.sendEvent("onMediaControlEvent", ["event": event, "payload": payload])
        }
        return player
    }()

    public func definition() -> ModuleDefinition {
        Name("RNExpoSonicPlayer")

        Events("onProgress", "onStatusChange", "onPlaybackInfo", "onMediaControlEvent")

        
        // MARK: - Core initialize function
        
        Function("initialize") { (config: [String: Any]) in
            let enableRemoteControls = config["enableRemoteControls"] as? Bool ?? true
            let enableNextTrack = config["enableNextTrack"] as? Bool ?? false
            let enablePreviousTrack = config["enablePreviousTrack"] as? Bool ?? false
            let skipForwardSeconds = config["skipForwardSeconds"] as? Double
            let skipBackwardSeconds = config["skipBackwardSeconds"] as? Double

            self.audioPlayer.initialize(options: PlayerInitializationOptions(
                enableRemoteControls: enableRemoteControls,
                skipForwardSeconds: skipForwardSeconds,
                skipBackwardSeconds: skipBackwardSeconds,
                enableNextTrack: enableNextTrack,
                enablePreviousTrack: enablePreviousTrack,
                nextTrackCallback: {
                    self.sendEvent("onMediaControlEvent", ["event": "onSkipToNext"])
                },
                previousTrackCallback: {
                    self.sendEvent("onMediaControlEvent", ["event": "onSkipToPrevious"])
                }
            ))
        }
        
        
        // MARK: - Basic Playback Controls
        Function("play") { (options: PlayAudioPlaybackOptions) in
            let internalOptions = AudioPlaybackOptions(
                url: options.url,
                title: options.title,
                artist: options.artist,
                artwork: options.artwork,
                duration: options.duration,
                album: options.album,
                description: options.description,
                isLive: options.isLive,
                useSpatialAudio: options.useSpatialAudio,

            )
            
            self.audioPlayer.play(options: internalOptions, useAVPlayerSpatial: options.useSpatialAudio)
        }

        Function("pause") {
            self.audioPlayer.pause()
        }

        Function("resume") {
            self.audioPlayer.resume()
        }

        Function("stop") {
            self.audioPlayer.stop()
        }
        
        
        
        Function("setMetaDataForCurrentTrack") { (metadata: [String: Any]) in
            let title = metadata["title"] as? String ?? "Unknown Title"
            let artist = metadata["artist"] as? String ?? "Unknown Artist"
            let artworkUri = metadata["artworkUri"] as? String
            let duration = metadata["duration"] as? Double ?? 0.0

            self.audioPlayer.updateNowPlayingInfo(title: title, artist: artist, artworkURL: artworkUri, duration: duration)
        }
    

        Function("seek") { (seconds: Double) in
            self.audioPlayer.seek(to: seconds)
        }

        // MARK: - Equalizer Functions
        Function("setBandGain") { (band: Int, gain: Double) in
            self.audioPlayer.setBandGain(band: band, gain: Float(gain))
        }

        Function("getBandGain") { (band: Int) -> Double? in
            return self.audioPlayer.getBandGain(band: band).map { Double($0) }
        }

        Function("getAllBandGains") { () -> [Double] in
            return self.audioPlayer.getAllBandGains().map { Double($0) }
        }

        Function("resetEqualizer") {
            self.audioPlayer.resetEqualizer()
        }

        Function("applyEqualizerPreset") { (presetName: String) in
            let preset: EqualizerPreset
            switch presetName.lowercased() {
            case "flat":
                preset = .flat
            case "rock":
                preset = .rock
            case "pop":
                preset = .pop
            case "jazz":
                preset = .jazz
            case "classical":
                preset = .classical
            case "bass":
                preset = .bass
            case "treble":
                preset = .treble
            case "vocal":
                preset = .vocal
            default:
                preset = .flat
            }
            self.audioPlayer.applyEqualizerPreset(preset)
        }

        // MARK: - Reverb Controls
        Function("setReverbWetDryMix") { (wetDryMix: Double) in
            self.audioPlayer.setReverbWetDryMix(Float(wetDryMix))
        }

        Function("setReverbPreset") { (presetName: String) in
            let preset: AVAudioUnitReverbPreset
            switch presetName.lowercased() {
            case "smallroom":
                preset = .smallRoom
            case "mediumroom":
                preset = .mediumRoom
            case "largeroom":
                preset = .largeRoom
            case "mediumhall":
                preset = .mediumHall
            case "largehall":
                preset = .largeHall
            case "plate":
                preset = .plate
            case "cathedral":
                preset = .cathedral
            default:
                preset = .smallRoom
            }
            self.audioPlayer.setReverbPreset(preset)
        }

        // MARK: - Slowed Reverb Controls
        Function("enableSlowedReverb") {
            self.audioPlayer.enableSlowedReverb()
        }

        Function("disableSlowedReverb") {
            self.audioPlayer.disableSlowedReverb()
        }

        Function("toggleSlowedReverb") {
            self.audioPlayer.toggleSlowedReverb()
        }

        Function("setSlowedReverb") { (speed: Double, pitch: Double, reverbAmount: Double) in
            self.audioPlayer.setSlowedReverb(speed: Float(speed), pitch: Float(pitch), reverbAmount: Float(reverbAmount))
        }

        Function("applySlowedReverbPreset") { (presetName: String) in
            let preset: SlowedReverbPreset
            switch presetName.lowercased() {
            case "classic":
                preset = .classic
            case "dreamy":
                preset = .dreamy
            case "subtle":
                preset = .subtle
            case "heavy":
                preset = .heavy
            default:
                preset = .classic
            }
            self.audioPlayer.applySlowedReverbPreset(preset)
        }

        Function("getAvailableSlowedReverbPresets") { () -> [String] in
            let presets = self.audioPlayer.getAvailableSlowedReverbPresets()
            return presets.map { $0.rawValue }
        }

        Function("getSlowedReverbPresetInfo") { (presetName: String) -> [String: Any] in
            let preset: SlowedReverbPreset
            switch presetName.lowercased() {
            case "classic":
                preset = .classic
            case "dreamy":
                preset = .dreamy
            case "subtle":
                preset = .subtle
            case "heavy":
                preset = .heavy
            default:
                preset = .classic
            }
            
            let info = self.audioPlayer.getSlowedReverbPresetInfo(preset)
            return [
                "name": info.name.rawValue,
                "speed": info.speed,
                "pitch": info.pitch,
                "reverbAmount": info.reverbAmount,
                "delayAmount": info.delayAmount,
                "delayTime": info.delayTime,
                "delayFeedback": info.delayFeedback,
                "description": info.description
            ]
        }

        // MARK: - Delay Controls
        Function("setDelayTime") { (delayTime: Double) in
            self.audioPlayer.setDelayTime(delayTime)
        }

        Function("setDelayFeedback") { (feedback: Double) in
            self.audioPlayer.setDelayFeedback(Float(feedback))
        }

        Function("setDelayWetDryMix") { (wetDryMix: Double) in
            self.audioPlayer.setDelayWetDryMix(Float(wetDryMix))
        }

        // MARK: - Distortion Controls
        Function("setDistortionWetDryMix") { (wetDryMix: Double) in
            self.audioPlayer.setDistortionWetDryMix(Float(wetDryMix))
        }

        Function("setDistortionPreset") { (presetName: String) in
            let preset: AVAudioUnitDistortionPreset
            switch presetName.lowercased() {
            case "drumsbitterbuzz":
                preset = .drumsBitBrush
            case "drumsbufferlayer":
                preset = .drumsBufferBeats
            case "drumslofi":
                preset = .drumsLoFi
            case "multibrokenspeaker":
                preset = .multiBrokenSpeaker
            case "multidecimated1":
                preset = .multiDecimated1
            case "multidecimated2":
                preset = .multiDecimated2
            case "multidecimated3":
                preset = .multiDecimated3
            case "multidecimated4":
                preset = .multiDecimated4
            case "multidistortioncubed":
                preset = .multiDistortedCubed
            case "multiecho1":
                preset = .multiEcho1
            case "multiecho2":
                preset = .multiEcho2
            case "multiechotight1":
                preset = .multiEchoTight1
            case "multiechotight2":
                preset = .multiEchoTight2
            case "speechalienchange":
                preset = .speechAlienChatter
            case "speechcosmicinterference":
                preset = .speechCosmicInterference
            case "speechradiodifference":
                preset = .speechRadioTower
            case "speechwavelform":
                preset = .speechWaves
            default:
                preset = .drumsBitBrush
            }
            self.audioPlayer.setDistortionPreset(preset)
        }

        // MARK: - Audio Preset Controls
        Function("applyAudioPreset") { (presetName: String) in
            let preset: AudioPreset
            switch presetName.lowercased() {
            case "normal":
                preset = .normal
            case "concert":
                preset = .concert
            case "studio":
                preset = .studio
            default:
                preset = .normal
            }
            self.audioPlayer.applyAudioPreset(preset)
        }

        // MARK: - Helper Functions
        Function("getAvailableEqualizerPresets") { () -> [String] in
            return ["flat", "rock", "pop", "jazz", "classical", "bass", "treble", "vocal"]
        }

        Function("getAvailableReverbPresets") { () -> [String] in
            return ["smallroom", "mediumroom", "largeroom", "mediumhall", "largehall", "plate", "cathedral"]
        }

        Function("getAvailableSlowedReverbPresets") { () -> [String] in
            return ["classic", "dreamy", "subtle", "heavy"]
        }

        Function("getAvailableAudioPresets") { () -> [String] in
            return ["normal", "concert", "studio"]
        }

        // MARK: - Band Frequency Info
        Function("getBandFrequencies") { () -> [Double] in
            return [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
        }
        
        
        Function("toggleAmbientMode") { (enabled: Bool) in
            self.audioPlayer.toggleAmbientMode(enabled)
        }


        // MARK: - Constants
        Constants([
            "PI": Double.pi,
            "MAX_GAIN": 12.0,
            "MIN_GAIN": -12.0,
            "BAND_COUNT": 10,
            "SLOWED_REVERB_MIN_SPEED": 0.25,
            "SLOWED_REVERB_MAX_SPEED": 4.0,
            "SLOWED_REVERB_MIN_PITCH": -2400.0,
            "SLOWED_REVERB_MAX_PITCH": 2400.0,
            "SLOWED_REVERB_MIN_REVERB": 0.0,
            "SLOWED_REVERB_MAX_REVERB": 100.0
        ])
    }
}


struct PlayAudioPlaybackOptions: Record {
    @Field var url: String
    @Field var title: String
    @Field var artist: String
    @Field var artwork: String?
    @Field var duration: Double?
    @Field var album: String?
    @Field var description: String?
    @Field var isLive: Bool
    @Field var useSpatialAudio: Bool
    @Field var shouldDownload: Bool
}

