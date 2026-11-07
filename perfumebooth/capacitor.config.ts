import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.perfumebooth.store',
  appName: 'Perfume Booth',
  webDir: 'public',
  server: {
    // Current live Cloudflare tunnel for physical phone testing
    // To test locally on Android Studio emulator: set to 'http://10.0.2.2:3000'
    // To test on same Wi-Fi without internet: set to 'http://192.168.31.168:3000'
    url: process.env.CAPACITOR_SERVER_URL || 'https://decreased-rebel-menus-pic.trycloudflare.com',
    cleartext: true,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a',
    },
  },
};

export default config;

