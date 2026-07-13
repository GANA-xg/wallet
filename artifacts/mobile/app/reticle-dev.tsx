// Reticle dev-only SDK connection — tree-shaken from production builds.
// Manual wiring per Reticle docs § "Plain / other frameworks"
// since Expo/Metro has no Vite plugin.

import { useEffect } from 'react';

export function ReticleDev() {
  useEffect(() => {
    // __DEV__ is a global that Expo defines; production builds strip
    // this module entirely via the dead-code elimination in Metro.
    if (!__DEV__) return;

    void import('@reticlehq/react').then(({ reticle, install, registerCapabilities }) => {
      install(); // enable component → source file:line mapping

      // If the Reticle daemon uses a custom token, pass it via EXPO_PUBLIC_RETICLE_TOKEN.
      // When unset, connect() reads ~/.reticle/pairing-token automatically.
      const token = process.env.EXPO_PUBLIC_RETICLE_TOKEN as string | undefined;
      reticle.connect({
        session: `wallet-${Date.now()}`,
        ...(token ? { token } : {}),
      });

      // Declare app capabilities for better error messages during test runs.
      registerCapabilities({
        stores: ['auth'],
      });
    });
  }, []);

  return null;
}
