import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.techlapse.resto',
  appName: 'App-Restaurant',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
};

export default config;
