// React Native entry point for Expo
import { registerRootComponent } from "expo";
// import RNExpoSonicPlayerModule from "expo-sonic-player";

import App from "./App";
import RNExpoSonicPlayerModule from "expo-sonic-ios-player";

registerRootComponent(App);

initPlayer();
async function initPlayer() {
  await RNExpoSonicPlayerModule.initialize({
    enableRemoteControls: true,
    enableNextTrack: true,
    enablePreviousTrack: true,
  });
}
