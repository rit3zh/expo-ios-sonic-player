import Foundation
import AVFoundation
import MediaPlayer
import UIKit

class AudioPlayer: NSObject {

    // MARK: - Audio Engine Components
    private let audioEngine = AVAudioEngine()
    private let playerNode = AVAudioPlayerNode()
    private let eq = AVAudioUnitEQ(numberOfBands: 10)
    private let environmentNode = AVAudioEnvironmentNode()
    private let reverb = AVAudioUnitReverb()
    private let delay = AVAudioUnitDelay()
    private let distortion = AVAudioUnitDistortion()
    private let timePitch = AVAudioUnitTimePitch()
    private let compressor = AVAudioUnitEffect(audioComponentDescription:
        AudioComponentDescription(
            componentType: kAudioUnitType_Effect,
            componentSubType: kAudioUnitSubType_DynamicsProcessor,
            componentManufacturer: kAudioUnitManufacturer_Apple,
            componentFlags: 0,
            componentFlagsMask: 0
        )
    )

    // MARK: - Playback Properties
    private var audioFile: AVAudioFile?
    private var isPlaying = false
    private var isPaused = false
    private var isUsingAVPlayer: Bool = false
    private var nativeSpatialPlayer: AVPlayer?
    
    
    
    private var currentFrame: AVAudioFramePosition = 0
    private var totalFrames: AVAudioFramePosition = 0
    
    // MARK: - Interruption Properties (FIXED)
    private var wasPlayingBeforeInterruption = false
    private var shouldResumeAfterInterruption = false
    private var interruptionStartTime: CFTimeInterval = 0
    private var isHandlingInterruption = false
    private var engineNeedsRestart = false

    // MARK: - Filter Properties
    private let bandFrequencies: [Float] = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
    private let maxGain: Float = 12.0
    private let minGain: Float = -12.0
    private var isSpatialAudioEnabled = false
    
    // MARK: - Slowed Reverb Properties
    private var isSlowedReverbEnabled = false
    private var currentSlowedReverbPreset: SlowedReverbPreset = .classic

    // MARK: - Callbacks
    var onProgress: ((Double) -> Void)?
    var onStatusChange: ((String) -> Void)?
    var onPlaybackInfo: ((Double, Double, Bool) -> Void)?
    var onMediaControlEvent: ((String, [String: Any]) -> Void)?

    // MARK: - Timer for progress updates
    private var progressTimer: Timer?

    override init() {
        super.init()
        setupAudioEngine()
        setupEqualizer()
        setupAudioSession()
        setupSpatialAudio()
//        setupAudioInterruptionObserver()
    }

    deinit {
        // Clean up observers
        NotificationCenter.default.removeObserver(self)
        stop()
        audioEngine.stop()
        progressTimer?.invalidate()
    }

    // MARK: - Audio Engine Setup
    
    
    private func setupAudioEngine() {
        // Attach all nodes
        audioEngine.attach(playerNode)
        audioEngine.attach(eq)
        audioEngine.attach(timePitch)
        audioEngine.attach(reverb)
        audioEngine.attach(delay)
        audioEngine.attach(distortion)
        audioEngine.attach(compressor)
        audioEngine.attach(environmentNode)
        
        // Use mono format for spatial audio
        let outputFormat = audioEngine.outputNode.inputFormat(forBus: 0)
        let monoFormat = AVAudioFormat(standardFormatWithSampleRate: outputFormat.sampleRate, channels: 1)!

        // Connect nodes with spatial audio in mind
        audioEngine.connect(playerNode, to: eq, format: monoFormat)
        audioEngine.connect(eq, to: timePitch, format: monoFormat)
        audioEngine.connect(timePitch, to: reverb, format: monoFormat)
        audioEngine.connect(reverb, to: delay, format: monoFormat)
        audioEngine.connect(delay, to: distortion, format: monoFormat)
        audioEngine.connect(distortion, to: compressor, format: monoFormat)
        audioEngine.connect(compressor, to: environmentNode, format: monoFormat)
        audioEngine.connect(environmentNode, to: audioEngine.mainMixerNode, format: nil)

        // Set rendering algorithm
        if #available(iOS 15.0, *) {
            playerNode.renderingAlgorithm = .HRTFHQ
        } else {
            playerNode.renderingAlgorithm = .HRTF
        }

        // Set position for spatial sound
        playerNode.position = AVAudio3DPoint(x: 0, y: 0, z: -2)
        environmentNode.listenerPosition = AVAudio3DPoint(x: 0, y: 0, z: 0)
        environmentNode.listenerAngularOrientation = AVAudioMake3DAngularOrientation(0, 0, 0)

        setupInitialEffectStates()
        startAudioEngine()
    }

    
//    private func setupAudioEngine() {
//        // Attach all nodes first
//        audioEngine.attach(playerNode)
//        audioEngine.attach(eq)
//        audioEngine.attach(timePitch)
//        audioEngine.attach(reverb)
//        audioEngine.attach(delay)
//        audioEngine.attach(distortion)
//        audioEngine.attach(compressor)
//        audioEngine.attach(environmentNode)
//
//        // Get the output format
//        let outputFormat = audioEngine.outputNode.inputFormat(forBus: 0)
//
//        // Create the initial connection chain (without spatial audio)
//        audioEngine.connect(playerNode, to: eq, format: outputFormat)
//        audioEngine.connect(eq, to: timePitch, format: outputFormat)
//        audioEngine.connect(timePitch, to: reverb, format: outputFormat)
//        audioEngine.connect(reverb, to: delay, format: outputFormat)
//        audioEngine.connect(delay, to: distortion, format: outputFormat)
//        audioEngine.connect(distortion, to: compressor, format: outputFormat)
//        audioEngine.connect(compressor, to: audioEngine.mainMixerNode, format: outputFormat)
//
//        // Initialize effects
//        setupInitialEffectStates()
//
//        startAudioEngine()
//    }
    
    // MARK: - Audio Engine Management (FIXED)
    private func startAudioEngine() {
        // Only start engine if not using AVPlayer
        guard !isUsingAVPlayer else { return }
        guard !audioEngine.isRunning else { return }
        
        do {
            try audioEngine.start()
            print("✅ Audio engine started successfully")
            engineNeedsRestart = false
        } catch {
            print("❌ Failed to start audio engine: \(error)")
            engineNeedsRestart = true
            onStatusChange?("error")
        }
    }
    
    private func stopAudioEngine() {
        if audioEngine.isRunning {
            audioEngine.stop()
            print("🛑 Audio engine stopped")
        }
    }
    
    private func restartAudioEngineIfNeeded() {
        // Skip if using AVPlayer
        guard !isUsingAVPlayer else { return }
        
        if engineNeedsRestart || !audioEngine.isRunning {
            print("🔄 Restarting audio engine...")
            
            // Stop and reset
            stopAudioEngine()
            
            // Small delay to let the system clean up
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                self.startAudioEngine()
            }
        }
    }
    
    private func setupSpatialAudio() {
        // Configure listener
        environmentNode.listenerPosition = AVAudio3DPoint(x: 0, y: 0, z: 0)
        environmentNode.listenerAngularOrientation = AVAudioMake3DAngularOrientation(0, 0, 0)

        // Player position in 3D space
        playerNode.position = AVAudio3DPoint(x: 0, y: 0, z: -2)

        // Rendering algorithm
        if #available(iOS 15.0, *) {
            environmentNode.renderingAlgorithm = .HRTFHQ
        } else {
            environmentNode.renderingAlgorithm = .sphericalHead
        }

        // Configure distance model
        environmentNode.distanceAttenuationParameters.maximumDistance = 10000
        environmentNode.distanceAttenuationParameters.referenceDistance = 1
        environmentNode.distanceAttenuationParameters.rolloffFactor = 1

        print("✅ Spatial audio setup complete")
    }

    private func setupInitialEffectStates() {
        // Disable all effects initially
        reverb.wetDryMix = 0
        delay.wetDryMix = 0
        distortion.wetDryMix = 0
        compressor.bypass = true

        // Initialize time pitch
        timePitch.rate = 1.0
        timePitch.pitch = 0.0
        timePitch.overlap = 8.0

        // Initialize all EQ bands to 0dB
        for i in 0..<eq.bands.count {
            eq.bands[i].gain = 0
            eq.bands[i].bypass = false
        }
    }

    private func setupEqualizer() {
        for (index, band) in eq.bands.enumerated() {
            band.filterType = .parametric
            band.frequency = bandFrequencies[safe: index] ?? 1000
            band.bandwidth = 1.0
            band.gain = 0.0
            band.bypass = false
        }
        eq.globalGain = 0
    }

    private func setupAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            
            // Configure for spatial audio support with proper options
            try session.setCategory(.playback,
                                    mode: .default,
                                    options: [.allowAirPlay, .allowBluetoothA2DP, .defaultToSpeaker, .duckOthers, .interruptSpokenAudioAndMixWithOthers])
        
            // Enable spatial audio if available (iOS 14+)
            if #available(iOS 14.0, *) {
                try session.setSupportsMultichannelContent(true)
            }
            
            try session.setActive(true)
            
            print("✅ Audio session configured for spatial audio")
        } catch {
            print("❌ Failed to setup audio session: \(error)")
        }
    }

    // MARK: - Audio Interruption Handling (COMPLETELY FIXED)
    private func setupAudioInterruptionObserver() {
        let center = NotificationCenter.default
        let session = AVAudioSession.sharedInstance()
        
        // Remove any existing observers first
        center.removeObserver(self, name: AVAudioSession.interruptionNotification, object: session)
        center.removeObserver(self, name: AVAudioSession.routeChangeNotification, object: session)
        
        // Add new observers
        center.addObserver(self,
                           selector: #selector(handleAudioInterruption),
                           name: AVAudioSession.interruptionNotification,
                           object: session)

        center.addObserver(self,
                           selector: #selector(handleRouteChange),
                           name: AVAudioSession.routeChangeNotification,
                           object: session)

        print("✅ Audio interruption + route observers set up")
    }
    
   
    
    private func handleInterruptionBegan() {
        guard !isHandlingInterruption else { return }
        
        isHandlingInterruption = true
        interruptionStartTime = CACurrentMediaTime()
        
        print("🔇 Audio interruption began")
        
        // Save current state
        wasPlayingBeforeInterruption = isPlaying
        shouldResumeAfterInterruption = isPlaying
        
        // Stop playback gracefully based on player type
        if isPlaying {
            if isUsingAVPlayer {
                nativeSpatialPlayer?.pause()
            } else {
                // Stop player node but keep track of position
                playerNode.stop()
            }
            
            stopProgressUpdates()
            isPlaying = false
            isPaused = true
            
            print("⏸️ Paused due to audio interruption")
        }
        
        // Mark engine as needing restart (only for AVAudioEngine)
        if !isUsingAVPlayer {
            engineNeedsRestart = true
        }
        
        onStatusChange?("interrupted")
    }
    
    private func handleInterruptionEnded(_ userInfo: [AnyHashable: Any]) {
        guard isHandlingInterruption else { return }
        
        print("🔊 Audio interruption ended")
        
        var shouldResume = false
        
        // Check if system suggests we should resume
        if let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt {
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
            shouldResume = options.contains(.shouldResume)
        }
        
        // Calculate interruption duration
        let interruptionDuration = CACurrentMediaTime() - interruptionStartTime
        print("⏱️ Interruption lasted: \(interruptionDuration) seconds")
        
        // Re-activate audio session
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setActive(false, options: .notifyOthersOnDeactivation)
            try session.setActive(true)
            print("✅ Audio session reactivated after interruption")
        } catch {
            print("❌ Failed to reactivate audio session: \(error)")
            onStatusChange?("session_error")
            isHandlingInterruption = false
            return
        }
        
        // Restart audio engine if needed (only for AVAudioEngine)
        if !isUsingAVPlayer {
            restartAudioEngineIfNeeded()
        }
        
        // Resume playback if appropriate
        if shouldResumeAfterInterruption && (shouldResume || wasPlayingBeforeInterruption) {
            // Add a small delay to ensure system is ready
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                if self.isUsingAVPlayer {
                    self.nativeSpatialPlayer?.play()
                    self.isPlaying = true
                    self.isPaused = false
                    self.startProgressUpdates()
                } else {
                    self.resumeAfterInterruption()
                }
                
                self.onStatusChange?("resumed_after_interruption")
                print("🎵 Resumed after interruption")
            }
        }
        
        // Clean up interruption state
        wasPlayingBeforeInterruption = false
        shouldResumeAfterInterruption = false
        isHandlingInterruption = false
    }
    
    private func resumeAfterInterruption() {
        if isUsingAVPlayer {
            guard let player = nativeSpatialPlayer else { return }
            player.play()
            isPlaying = true
            isPaused = false
            startProgressUpdates()
            updateNowPlayingProgress()
            return
        }
        
        // AVAudioEngine resume logic
        guard let audioFile = audioFile, !isPlaying else { return }
        
        do {
            // Ensure audio engine is running
            if !audioEngine.isRunning {
                try audioEngine.start()
            }
            
            // Reset player node
            playerNode.stop()
            playerNode.reset()
            
            // Re-schedule from current position
            if currentFrame < totalFrames {
                scheduleAudioFileFromPosition(currentFrame)
            }
            
            // Resume playback
            playerNode.play()
            isPlaying = true
            isPaused = false
            
            startProgressUpdates()
            updateNowPlayingProgress()
            
            print("▶️ Successfully resumed after interruption")
            
        } catch {
            print("❌ Failed to resume after interruption: \(error)")
            onStatusChange?("resume_error")
        }
    }
    
    @objc private func handleRouteChange(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }

        switch reason {
        case .oldDeviceUnavailable:
            print("🎧 Output device disconnected (e.g. headphones unplugged)")
            if isPlaying {
                pause()
                onStatusChange?("route_changed_paused")
            }

        case .newDeviceAvailable:
            print("🎧 New audio device available")
            // Engine might need restart for new device (only for AVAudioEngine)
            if !isUsingAVPlayer {
                engineNeedsRestart = true
            }

        case .categoryChange:
            print("🔄 Audio category changed")
            if !isUsingAVPlayer {
                engineNeedsRestart = true
            }

        default:
            break
        }
    }
    
    
    // Helper method to get current playback time
    private func getCurrentPlaybackTime() -> Double {
        if isUsingAVPlayer {
            let time = nativeSpatialPlayer?.currentTime().seconds ?? 0
            return max(0, time.isFinite ? time : 0)
        }

        guard let audioFile = audioFile else { return 0 }
        let sampleRate = audioFile.processingFormat.sampleRate
        let time = Double(currentFrame) / sampleRate
        return max(0, min(time, Double(totalFrames) / sampleRate))
    }
    
    func setSpatialAudioPosition(x: Float, y: Float, z: Float) {
        if isUsingAVPlayer {
            print("⚠️ Spatial audio positioning not available for AVPlayer")
            return
        }
        
        guard isSpatialAudioEnabled else {
            print("⚠️ Spatial audio is not enabled")
            return
        }
        
        let position = AVAudio3DPoint(x: x, y: y, z: z)
        playerNode.position = position
        
        print("🎯 Spatial audio position set to: (\(x), \(y), \(z))")
    }

    // MARK: - Playback Control (IMPROVED)
    func play(options: AudioPlaybackOptions, useAVPlayerSpatial: Bool = false) {
        // Reset interruption state
        isHandlingInterruption = false
        
        // Request audio focus to stop other apps
        requestAudioFocus()
        
        isUsingAVPlayer = useAVPlayerSpatial
        
        guard let audioURL = URL(string: options.url) else {
            onStatusChange?("error")
            return
        }
        
        
        
        if options.isLive {
              print("🔴 Live stream detected - using AVPlayer")
              isUsingAVPlayer = true
              playWithAVPlayer(url: audioURL)
              return updateNowPlayingInfo(
                title: options.title,
                artist: options.artist,
                artworkURL: options.artwork,
                duration: options.duration ?? 0,
                album: options.album,
                description: options.description,
                isLive: options.isLive
            )
          }
        

        if useAVPlayerSpatial {
            playWithAVPlayer(url: audioURL)
            return updateNowPlayingInfo(
                title: options.title,
                artist: options.artist,
                artworkURL: options.artwork,
                duration: options.duration ?? 0,
                album: options.album,
                description: options.description,
                isLive: options.isLive
            )
        }
        
        updateNowPlayingInfo(
            title: options.title,
            artist: options.artist,
            artworkURL: options.artwork,
            duration: options.duration ?? 0,
            album: options.album,
            description: options.description,
            isLive: options.isLive
        )

        if audioURL.scheme == "http" || audioURL.scheme == "https" {
            onStatusChange?("loading")
            downloadAudioFile(from: options.url) { [weak self] localURL in
                guard let self = self, let localURL = localURL else {
                    self?.onStatusChange?("error")
                    return
                }
                DispatchQueue.main.async {
                    self.playLocalFile(url: localURL)
                    if options.duration == nil {
                        let actual = self.getActualTrackDuration()
                        self.updateNowPlayingInfo(
                            title: options.title,
                            artist: options.artist,
                            artworkURL: options.artwork,
                            duration: actual,
                            album: options.album,
                            description: options.description,
                            isLive: options.isLive
                        )
                    }
                }
            }
        } else {
            playLocalFile(url: audioURL)
        }
    }
    
    private func playWithAVPlayer(url: URL) {
        stop()

        let asset = AVURLAsset(url: url)
        let item = AVPlayerItem(asset: asset)

        // ✅ Just check if it's a live stream from the options
        if isUsingAVPlayer {
            // Configure for streaming (live or spatial)
            item.preferredForwardBufferDuration = 2.0
            item.canUseNetworkResourcesForLiveStreamingWhilePaused = true
            
            if #available(iOS 15.0, *) {
                item.allowedAudioSpatializationFormats = [.monoAndStereo, .multichannel]
            }
        }

        let player = AVPlayer(playerItem: item)
        nativeSpatialPlayer = player

        // Add observers
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAVPlayerDidFinishPlaying),
            name: .AVPlayerItemDidPlayToEndTime,
            object: item
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAVPlayerItemFailed),
            name: .AVPlayerItemFailedToPlayToEndTime,
            object: item
        )

        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)

        player.play()

        isPlaying = true
        isPaused = false
        startProgressUpdates()
        onStatusChange?("ready")
    }

    
    @objc private func handleAVPlayerItemFailed(notification: Notification) {
        print("❌ Live stream failed")
        isPlaying = false
        isPaused = false
        stopProgressUpdates()
        onStatusChange?("error")
    }
    
    private func handleAudioFinished() {
        print("✅ Playback finished")

        isPlaying = false
        isPaused = false
        currentFrame = totalFrames  // Lock it at the end
        stopProgressUpdates()
        updateProgress()
        onStatusChange?("ended")

    }

    
    @objc private func handleAVPlayerDidFinishPlaying(notification: Notification) {
        print("✅ AVPlayer finished playing")

        isPlaying = false
        isPaused = false
        stopProgressUpdates()
        updateProgress()
        onStatusChange?("ended in av player")
    }

    
    private func playLocalFile(url: URL) {
        stop()

        do {
            audioFile = try AVAudioFile(forReading: url)
            totalFrames = audioFile?.length ?? 0
            currentFrame = 0

            guard let audioFile = audioFile else {
                onStatusChange?("error")
                return
            }

            restartAudioEngineIfNeeded()

            // ✅ Schedule the file from disk instead of full-buffer loading
            scheduleAudioFileFromPosition(currentFrame)

            if !audioEngine.isRunning {
                try audioEngine.start()
            }

            playerNode.play()
            isPlaying = true
            isPaused = false

            onStatusChange?("ready")
            startProgressUpdates()

        } catch {
            print("❌ Failed to play audio file: \(error)")
            onStatusChange?("error")
        }
    }

    func downloadAudioFile(from urlString: String, completion: @escaping (URL?) -> Void) {
        guard let url = URL(string: urlString) else {
            completion(nil)
            return
        }

        let task = URLSession.shared.downloadTask(with: url) { (tempURL, response, error) in
            guard let tempURL = tempURL, error == nil else {
                print("Download error: \(error?.localizedDescription ?? "Unknown error")")
                completion(nil)
                return
            }
            completion(tempURL)
        }
        task.resume()
    }

    func pause() {
        guard isPlaying && !isHandlingInterruption else { return }
        
        if isUsingAVPlayer {
            nativeSpatialPlayer?.pause()
        } else {
            // Don't call playerNode.stop() here, just pause
            playerNode.pause()
        }
        
        isPaused = true
        isPlaying = false
        stopProgressUpdates()
        updateProgress()
        updateNowPlayingProgress()
    }

    func resume() {
        guard isPaused && !isHandlingInterruption else { return }
        
        do {
            try AVAudioSession.sharedInstance().setActive(true)

            if isUsingAVPlayer {
                // ✅ For live streams, check if player item is still valid
                guard let player = nativeSpatialPlayer else {
                    print("❌ No AVPlayer instance for resume")
                    onStatusChange?("resume_error_no_player")
                    return
                }
                
                // ✅ Check if current item is still playable
                if let currentItem = player.currentItem {
                    if currentItem.status == .failed || currentItem.error != nil {
                        print("🔄 Live stream item failed, recreating...")
                        // ✅ For live streams, recreate the player item
                        if let url = (currentItem.asset as? AVURLAsset)?.url {
                            playWithAVPlayer(url: url)
                            return
                        }
                    } else {
                        // ✅ Item is good, just resume
                        player.play()
                    }
                } else {
                    print("❌ No current item in AVPlayer")
                    onStatusChange?("resume_error_no_item")
                    return
                }
                
                isPlaying = true
                isPaused = false
                startProgressUpdates()
                updateNowPlayingProgress()
                return
            }

            // ✅ Rest of your existing AVAudioEngine resume logic...
            guard let audioFile = audioFile else {
                print("❌ No audio file loaded for resume")
                onStatusChange?("resume_error_no_file")
                return
            }

            restartAudioEngineIfNeeded()

            if !playerNode.isPlaying {
                playerNode.stop()
                playerNode.reset()

                if currentFrame >= totalFrames {
                    currentFrame = 0
                }

                scheduleAudioFileFromPosition(currentFrame)
            }

            playerNode.play()
            isPaused = false
            isPlaying = true
            startProgressUpdates()
            updateNowPlayingProgress()
            print("▶️ Player resumed successfully")

        } catch {
            print("❌ Failed to resume playback: \(error)")
            onStatusChange?("resume_error")
        }
    }

    func stop() {
        if isUsingAVPlayer {
            if let player = nativeSpatialPlayer {
                player.pause()
                if let item = player.currentItem {
                    NotificationCenter.default.removeObserver(self, name: .AVPlayerItemDidPlayToEndTime, object: item)
                }
                // Completely reset AVPlayer
                player.replaceCurrentItem(with: nil)
            }
            nativeSpatialPlayer = nil
        } else {
            playerNode.stop()
        }
        
        isPlaying = false
        isPaused = false
        currentFrame = 0
        stopProgressUpdates()
        updateProgress()
        
        // Clear Now Playing Info
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            print("🛑 Audio session deactivated")
        } catch {
            print("❌ Failed to deactivate audio session: \(error)")
        }
    }


    // MARK: - Seeking (IMPROVED)
   
    func seek(to seconds: Double) {
        guard !isHandlingInterruption else { return }
        
        if isUsingAVPlayer {
            let time = CMTime(seconds: seconds, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
            nativeSpatialPlayer?.seek(to: time) { [weak self] _ in
                self?.updateProgress()
                self?.updateNowPlayingProgress()
                self?.onStatusChange?("seeked")
            }
            return
        }

        guard let audioFile = audioFile else { return }

        let sampleRate = audioFile.processingFormat.sampleRate
        let targetFrame = AVAudioFramePosition(seconds * sampleRate)

        guard targetFrame >= 0 && targetFrame < totalFrames else { return }

        let wasPlaying = isPlaying

        // Stop and reset player node
        playerNode.stop()
        playerNode.reset()
        
        // Update current frame
        currentFrame = targetFrame
        
        // Only reschedule if we're not at the very end
        if targetFrame < totalFrames - 1000 {
            scheduleAudioFileFromPosition(targetFrame)
            
            if wasPlaying && !isHandlingInterruption {
                playerNode.play()
                isPlaying = true
                isPaused = false
            } else {
                isPaused = true
                isPlaying = false
            }
        } else {
            // We're at the end, handle accordingly
            handleAudioFinished()
            return
        }

        updateProgress()
        updateNowPlayingProgress()
        onStatusChange?("seeked")
    }


    private func scheduleAudioFileFromPosition(_ startFrame: AVAudioFramePosition) {
        guard let audioFile = audioFile else { return }
        
        let framesToPlay = totalFrames - startFrame
        guard framesToPlay > 0 else { return }
        
        // Clear any existing scheduled buffers first
        playerNode.stop()
        
        playerNode.scheduleSegment(
            audioFile,
            startingFrame: startFrame,
            frameCount: AVAudioFrameCount(framesToPlay),
            at: nil,
            completionHandler: { [weak self] in
                // Only trigger finished if we actually played to the end
                guard let self = self else { return }
                
                DispatchQueue.main.async {
                    // Check if we're actually at the end and not just seeking
                    if self.currentFrame >= self.totalFrames - 1000 { // Small buffer for rounding
                        self.handleAudioFinished()
                    }
                }
            }
        )
    }

    // MARK: - Progress Updates
    private func startProgressUpdates() {
        progressTimer?.invalidate()
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            self?.updateProgress()
        }
    }

    private func stopProgressUpdates() {
        progressTimer?.invalidate()
        progressTimer = nil
        
    }

    private func updateProgress() {
        if isUsingAVPlayer {
            guard let player = nativeSpatialPlayer,
                  let currentItem = player.currentItem else { return }

            let currentTimeSeconds = player.currentTime().seconds
            let totalTimeSeconds = currentItem.duration.seconds.isFinite ? currentItem.duration.seconds : 0

            onPlaybackInfo?(currentTimeSeconds, totalTimeSeconds, isPlaying)
            return
        }

        // AVAudioEngine - Update currentFrame based on actual playback
        guard let audioFile = audioFile else { return }
        
        let sampleRate = audioFile.processingFormat.sampleRate
        let totalTimeSeconds = Double(totalFrames) / sampleRate
        
        // Update currentFrame if playing
        if isPlaying && !isPaused {
            let frameAdvance = AVAudioFramePosition(sampleRate * 0.1 * Double(timePitch.rate))
            currentFrame += frameAdvance
            
            // Prevent going beyond total frames
            if currentFrame >= totalFrames {
                currentFrame = totalFrames
                handleAudioFinished()
                return
            }
        }
        
        let currentTimeSeconds = Double(currentFrame) / sampleRate
        onPlaybackInfo?(currentTimeSeconds, totalTimeSeconds, isPlaying)
    }

    private func requestAudioFocus() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setActive(false, options: .notifyOthersOnDeactivation)
            try session.setActive(true)
            print("🎯 Audio focus requested")
        } catch {
            print("❌ Failed to request audio focus: \(error)")
        }
    }

    // MARK: - Slowed Reverb Implementation
    func enableSlowedReverb() {
        isSlowedReverbEnabled = true
        applySlowedReverbPreset(currentSlowedReverbPreset)
    }

    func disableSlowedReverb() {
        isSlowedReverbEnabled = false
        timePitch.rate = 1.0
        timePitch.pitch = 0.0
        reverb.wetDryMix = 0
        delay.wetDryMix = 0
    }

    func toggleSlowedReverb() {
        if isSlowedReverbEnabled {
            disableSlowedReverb()
        } else {
            enableSlowedReverb()
        }
    }

    func setSlowedReverb(speed: Float, pitch: Float, reverbAmount: Float) {
        timePitch.rate = speed
        timePitch.pitch = pitch
        reverb.wetDryMix = reverbAmount
    }

    func applySlowedReverbPreset(_ preset: SlowedReverbPreset) {
        currentSlowedReverbPreset = preset
        guard isSlowedReverbEnabled else { return }
        
        let presetInfo = getSlowedReverbPresetInfo(preset)
        
        timePitch.rate = presetInfo.speed
        timePitch.pitch = presetInfo.pitch
        reverb.wetDryMix = presetInfo.reverbAmount
        reverb.loadFactoryPreset(.largeHall)
        delay.wetDryMix = presetInfo.delayAmount
        delay.delayTime = presetInfo.delayTime
        delay.feedback = presetInfo.delayFeedback
    }

    func getAvailableSlowedReverbPresets() -> [SlowedReverbPreset] {
        return [.classic, .dreamy, .subtle, .heavy]
    }

    func getSlowedReverbPresetInfo(_ preset: SlowedReverbPreset) -> SlowedReverbPresetInfo {
        switch preset {
        case .classic:
            return SlowedReverbPresetInfo(
                name: .classic, speed: 0.8, pitch: -200, reverbAmount: 40,
                delayAmount: 15, delayTime: 0.3, delayFeedback: 25,
                description: "Classic slowed + reverb with moderate slow down and rich reverb"
            )
        case .dreamy:
            return SlowedReverbPresetInfo(
                name: .dreamy, speed: 0.7, pitch: -400, reverbAmount: 60,
                delayAmount: 25, delayTime: 0.5, delayFeedback: 35,
                description: "Dreamy atmosphere with heavy reverb and significant slowdown"
            )
        case .subtle:
            return SlowedReverbPresetInfo(
                name: .subtle, speed: 0.9, pitch: -100, reverbAmount: 25,
                delayAmount: 10, delayTime: 0.2, delayFeedback: 15,
                description: "Subtle slowed effect with light reverb"
            )
        case .heavy:
            return SlowedReverbPresetInfo(
                name: .heavy, speed: 0.6, pitch: -600, reverbAmount: 80,
                delayAmount: 40, delayTime: 0.7, delayFeedback: 45,
                description: "Heavy slowed + reverb with maximum atmospheric effect"
            )
        }
    }

    
   
    
    
    @objc private func handleAudioInterruption(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }
        
        switch type {
        case .began:
            print("🔇 Audio interruption began")
            handleInterruptionBegan()
            
        case .ended:
            print("🔊 Audio interruption ended")
            handleInterruptionEnded(userInfo)
            
        @unknown default:
            break
        }
    }
    // MARK: - Initialize function
    
    func initialize(options: PlayerInitializationOptions) {
        
      
        
        guard options.enableRemoteControls else { return }
        
        
        

        let commandCenter = MPRemoteCommandCenter.shared()
        
        commandCenter.changePlaybackPositionCommand.isEnabled = true
        commandCenter.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let event = event as? MPChangePlaybackPositionCommandEvent else {
                return .commandFailed
            }

            let position = event.positionTime
            self?.seek(to: position)
            self?.onMediaControlEvent?("onSeekFromLockScreen", ["position": position])
            return .success
        }

        commandCenter.playCommand.isEnabled = true
        commandCenter.playCommand.addTarget { [weak self] _ in
            self?.resume()
            self?.onMediaControlEvent?("onPlayPressed", [:])
            return .success
        }

        commandCenter.pauseCommand.isEnabled = true
        commandCenter.pauseCommand.addTarget { [weak self] _ in
            self?.pause()
            self?.onMediaControlEvent?("onPausePressed", [:])
            return .success
        }

        if let forward = options.skipForwardSeconds {
            commandCenter.skipForwardCommand.isEnabled = true
            commandCenter.skipForwardCommand.preferredIntervals = [NSNumber(value: forward)]
            commandCenter.skipForwardCommand.addTarget { [weak self] event in
                if let skipEvent = event as? MPSkipIntervalCommandEvent {
                    let current = self?.getCurrentPlaybackTime() ?? 0
                    self?.seek(to: current + skipEvent.interval)
                    self?.onMediaControlEvent?("onSkipForward", ["seconds": skipEvent.interval])
                    return .success
                }
                return .commandFailed
            }
        }

        if let back = options.skipBackwardSeconds {
            commandCenter.skipBackwardCommand.isEnabled = true
            commandCenter.skipBackwardCommand.preferredIntervals = [NSNumber(value: back)]
            commandCenter.skipBackwardCommand.addTarget { [weak self] event in
                if let skipEvent = event as? MPSkipIntervalCommandEvent {
                    let current = self?.getCurrentPlaybackTime() ?? 0
                    self?.seek(to: max(0, current - skipEvent.interval))
                    self?.onMediaControlEvent?("onSkipBackward", ["seconds": skipEvent.interval])
                    return .success
                }
                return .commandFailed
            }
        }

        if options.enableNextTrack {
            commandCenter.nextTrackCommand.isEnabled = true
            commandCenter.nextTrackCommand.addTarget { [weak self] _ in
                options.nextTrackCallback?()
                self?.onMediaControlEvent?("onSkipToNext", [:])
                return .success
            }
        }

        if options.enablePreviousTrack {
            commandCenter.previousTrackCommand.isEnabled = true
            commandCenter.previousTrackCommand.addTarget { [weak self] _ in
                options.previousTrackCallback?()
                self?.onMediaControlEvent?("onSkipToPrevious", [:])
                return .success
            }
        }

        print("✅ Player initialized with remote controls")
    }
    
    // MARK: - Remote Transport Controls ⚠️

    
    func updateNowPlayingInfo(
        title: String,
        artist: String,
        artworkURL: String?,
        duration: Double,
        album: String? = nil,
        description: String? = nil,
        isLive: Bool = false
    ) {
        // Fallback if duration is 0
        var finalDuration = duration
        if duration <= 0 {
            finalDuration = getActualTrackDuration()
        }

        var nowPlayingInfo: [String: Any] = [
            MPMediaItemPropertyTitle: title,
            MPMediaItemPropertyArtist: artist,
            MPMediaItemPropertyPlaybackDuration: finalDuration,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: 0,
            MPNowPlayingInfoPropertyPlaybackRate: 1.0,
            MPNowPlayingInfoPropertyIsLiveStream: isLive,
            MPNowPlayingInfoPropertyMediaType: MPNowPlayingInfoMediaType.audio.rawValue // ✅ Add this
        ]

        if let album = album {
            nowPlayingInfo[MPMediaItemPropertyAlbumTitle] = album
        }

        if let desc = description {
            nowPlayingInfo["description"] = desc
        }

        MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo

        if let urlString = artworkURL, let url = URL(string: urlString) {
            Task {
                await loadArtwork(from: url)
            }
        }
    }

    private func loadArtwork(from url: URL) async {
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let image = UIImage(data: data) else { return }
            
            await MainActor.run {
                let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
                var updatedInfo = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
                updatedInfo[MPMediaItemPropertyArtwork] = artwork
                MPNowPlayingInfoCenter.default().nowPlayingInfo = updatedInfo
            }
        } catch {
            print("Failed to load artwork: \(error)")
        }
    }
    
    private func getActualTrackDuration() -> Double {
        if isUsingAVPlayer {
            guard let duration = nativeSpatialPlayer?.currentItem?.asset.duration else { return 0 }
            return CMTimeGetSeconds(duration)
        } else if let audioFile = audioFile {
            let sampleRate = audioFile.processingFormat.sampleRate
            return Double(audioFile.length) / sampleRate
        }
        return 0
    }

    
    func updateNowPlayingProgress() {
        guard var nowPlayingInfo = MPNowPlayingInfoCenter.default().nowPlayingInfo else { return }

        let currentTime = getCurrentPlaybackTime()
        nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0

        MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
    }

    

    // MARK: - Equalizer Controls
    func setBandGain(band: Int, gain: Float) {
        guard eq.bands.indices.contains(band) else { return }
        eq.bands[band].gain = min(max(gain, minGain), maxGain)
    }

    func getBandGain(band: Int) -> Float? {
        guard eq.bands.indices.contains(band) else { return nil }
        return eq.bands[band].gain
    }

    func getAllBandGains() -> [Float] {
        return eq.bands.map { $0.gain }
    }

    func resetEqualizer() {
        for band in eq.bands {
            band.gain = 0.0
        }
    }

    // MARK: - Audio Effects
    func setReverbWetDryMix(_ wetDryMix: Float) {
        reverb.wetDryMix = min(max(wetDryMix, 0), 100)
    }

    func setReverbPreset(_ preset: AVAudioUnitReverbPreset) {
        reverb.loadFactoryPreset(preset)
    }

    func setDelayTime(_ delayTime: TimeInterval) {
        delay.delayTime = min(max(delayTime, 0), 2.0)
    }

    func setDelayFeedback(_ feedback: Float) {
        delay.feedback = min(max(feedback, -100), 100)
    }

    func setDelayWetDryMix(_ wetDryMix: Float) {
        delay.wetDryMix = min(max(wetDryMix, 0), 100)
    }

    func setDistortionPreset(_ preset: AVAudioUnitDistortionPreset) {
        distortion.loadFactoryPreset(preset)
    }

    func setDistortionWetDryMix(_ wetDryMix: Float) {
        distortion.wetDryMix = min(max(wetDryMix, 0), 100)
    }

    // MARK: - Preset Management
    func applyEqualizerPreset(_ preset: EqualizerPreset) {
        for (index, gain) in preset.bandGains.enumerated() {
            setBandGain(band: index, gain: gain)
        }
    }
    
    func toggleAmbientMode(_ enabled: Bool) {
        do {
            let session = AVAudioSession.sharedInstance()

            // Pause playback safely
            let wasPlaying = isPlaying
            pause()

            // Set the desired category
            if enabled {
                try session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
                print("🎧 Ambient mode enabled")
            } else {
                try session.setCategory(.playback, mode: .default, options: [.allowAirPlay, .allowBluetoothA2DP, .defaultToSpeaker])
                print("🎧 Playback mode enabled")
            }

            try session.setActive(true)

            // Resume playback safely
            if wasPlaying {
                resume()
            }

            onStatusChange?("ambientMode:\(enabled)")
        } catch {
            print("❌ Failed to toggle ambient mode: \(error)")
            onStatusChange?("error")
        }
    }
    

    func applyAudioPreset(_ preset: AudioPreset) {
        applyEqualizerPreset(preset.equalizerPreset)
        setReverbWetDryMix(preset.reverbWetDryMix)
        setDelayWetDryMix(preset.delayWetDryMix)
        setDistortionWetDryMix(preset.distortionWetDryMix)

        if let reverbPreset = preset.reverbPreset {
            setReverbPreset(reverbPreset)
        }

        if let distortionPreset = preset.distortionPreset {
            setDistortionPreset(distortionPreset)
        }

        setDelayTime(preset.delayTime)
        setDelayFeedback(preset.delayFeedback)
    }
}

// MARK: - Supporting Types
enum SlowedReverbPreset: String, CaseIterable {
    case classic = "classic"
    case dreamy = "dreamy"
    case subtle = "subtle"
    case heavy = "heavy"
}

struct SlowedReverbPresetInfo {
    let name: SlowedReverbPreset
    let speed: Float
    let pitch: Float
    let reverbAmount: Float
    let delayAmount: Float
    let delayTime: TimeInterval
    let delayFeedback: Float
    let description: String
}

struct AudioPreset {
    let name: String
    let equalizerPreset: EqualizerPreset
    let reverbWetDryMix: Float
    let reverbPreset: AVAudioUnitReverbPreset?
    let delayTime: TimeInterval
    let delayFeedback: Float
    let delayWetDryMix: Float
    let distortionWetDryMix: Float
    let distortionPreset: AVAudioUnitDistortionPreset?

    static let normal = AudioPreset(
        name: "Normal", equalizerPreset: .flat, reverbWetDryMix: 0, reverbPreset: nil,
        delayTime: 0, delayFeedback: 0, delayWetDryMix: 0, distortionWetDryMix: 0, distortionPreset: nil
    )

    static let concert = AudioPreset(
        name: "Concert", equalizerPreset: .classical, reverbWetDryMix: 25, reverbPreset: .cathedral,
        delayTime: 0.1, delayFeedback: 10, delayWetDryMix: 10, distortionWetDryMix: 0, distortionPreset: nil
    )

    static let studio = AudioPreset(
        name: "Studio", equalizerPreset: .vocal, reverbWetDryMix: 5, reverbPreset: .smallRoom,
        delayTime: 0.05, delayFeedback: 5, delayWetDryMix: 5, distortionWetDryMix: 0, distortionPreset: nil
    )
}

struct EqualizerPreset {
    let name: String
    let bandGains: [Float]

    static let flat = EqualizerPreset(name: "Flat", bandGains: Array(repeating: 0.0, count: 10))
    static let rock = EqualizerPreset(name: "Rock", bandGains: [3.0, 2.0, -1.0, -2.0, -1.0, 1.0, 4.0, 5.0, 5.0, 5.0])
    static let pop = EqualizerPreset(name: "Pop", bandGains: [-1.0, 2.0, 4.0, 4.0, 2.0, 0.0, -1.0, -1.0, -1.0, -1.0])
    static let jazz = EqualizerPreset(name: "Jazz", bandGains: [2.0, 1.0, 0.0, 1.0, -1.0, -1.0, 0.0, 1.0, 2.0, 3.0])
    static let classical = EqualizerPreset(name: "Classical", bandGains: [3.0, 2.0, -1.0, -1.0, -1.0, 0.0, 1.0, 2.0, 3.0, 4.0])
    static let bass = EqualizerPreset(name: "Bass", bandGains: [6.0, 5.0, 4.0, 2.0, 1.0, -1.0, -2.0, -3.0, -3.0, -3.0])
    static let treble = EqualizerPreset(name: "Treble", bandGains: [-3.0, -3.0, -3.0, -2.0, -1.0, 1.0, 2.0, 4.0, 5.0, 6.0])
    static let vocal = EqualizerPreset(name: "Vocal", bandGains: [-2.0, -1.0, 1.0, 3.0, 4.0, 4.0, 3.0, 1.0, 0.0, -1.0])
}


struct AudioPlaybackOptions {
    let url: String
    let title: String
    let artist: String
    let artwork: String?
    let duration: Double?
    let album: String?
    let description: String?
    let isLive: Bool
    let useSpatialAudio: Bool
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        return indices.contains(index) ? self[index] : nil
    }
}
struct PlayerInitializationOptions {
    let enableRemoteControls: Bool

    // Skip Forward/Backward by seconds
    let skipForwardSeconds: Double?
    let skipBackwardSeconds: Double?

    // Next/Previous track
    let enableNextTrack: Bool
    let enablePreviousTrack: Bool
    let nextTrackCallback: (() -> Void)?
    let previousTrackCallback: (() -> Void)?
}

