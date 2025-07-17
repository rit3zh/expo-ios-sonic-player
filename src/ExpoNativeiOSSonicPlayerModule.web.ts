import { registerWebModule, NativeModule } from 'expo';

import { ExpoNativeiOSSonicPlayerModuleEvents } from './ExpoNativeiOSSonicPlayer.types';

class ExpoNativeiOSSonicPlayerModule extends NativeModule<ExpoNativeiOSSonicPlayerModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(ExpoNativeiOSSonicPlayerModule, 'ExpoNativeiOSSonicPlayerModule');
