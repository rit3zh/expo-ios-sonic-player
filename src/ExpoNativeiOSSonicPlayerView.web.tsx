import * as React from 'react';

import { ExpoNativeiOSSonicPlayerViewProps } from './ExpoNativeiOSSonicPlayer.types';

export default function ExpoNativeiOSSonicPlayerView(props: ExpoNativeiOSSonicPlayerViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
