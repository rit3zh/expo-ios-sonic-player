import { NativeModule, requireNativeModule } from 'expo';

import { ExpoNativeiOSSonicPlayerModuleEvents } from './ExpoNativeiOSSonicPlayer.types';

declare class ExpoNativeiOSSonicPlayerModule extends NativeModule<ExpoNativeiOSSonicPlayerModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoNativeiOSSonicPlayerModule>('ExpoNativeiOSSonicPlayer');
