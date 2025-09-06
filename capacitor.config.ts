import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.6434c475678747b5b1385513ddf95649',
  appName: 'wayfarer-weave',
  webDir: 'dist',
  server: {
    url: 'https://6434c475-6787-47b5-b138-5513ddf95649.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    }
  }
};

export default config;