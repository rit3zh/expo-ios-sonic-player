import { requireNativeView } from 'expo';
import * as React from 'react';

import { ExpoNativeiOSSonicPlayerViewProps } from './ExpoNativeiOSSonicPlayer.types';

const NativeView: React.ComponentType<ExpoNativeiOSSonicPlayerViewProps> =
  requireNativeView('ExpoNativeiOSSonicPlayer');

export default function ExpoNativeiOSSonicPlayerView(props: ExpoNativeiOSSonicPlayerViewProps) {
  return <NativeView {...props} />;
}
