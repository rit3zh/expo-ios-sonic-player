// Reexport the native module. On web, it will be resolved to ExpoNativeiOSSonicPlayerModule.web.ts
// and on native platforms to ExpoNativeiOSSonicPlayerModule.ts
export { default } from './ExpoNativeiOSSonicPlayerModule';
export { default as ExpoNativeiOSSonicPlayerView } from './ExpoNativeiOSSonicPlayerView';
export * from  './ExpoNativeiOSSonicPlayer.types';
