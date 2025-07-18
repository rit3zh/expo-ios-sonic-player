// Reexport the native module. On web, it will be resolved to RNExpoSonicPlayerModule.web.ts
// and on native platforms to RNExpoSonicPlayerModule.ts
export { default } from "./RNSonicModule";

export * from "./RNExpoSonicPlayer.types";
export * from "./hooks/useBufferedProgress";
export * from "./hooks/usePlayer";
export * from "./typings/AudioPresets";
export * from "./typings/Events";
