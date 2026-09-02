const { withAndroidManifest } = require("@expo/config-plugins");

// expo-audio's own AndroidManifest.xml unconditionally bundles two
// Play Console-flagged foreground-service permissions plus the services
// that require them: a lock-screen media-controls session
// (AudioControlsService, mediaPlayback) and a background audio recorder
// (AudioRecordingService, microphone). Neither is used here — the app
// never calls setActiveForLockScreen and never records audio. The
// ride-request ringtone (app/(app)/home/index.tsx) plays via
// setAudioModeAsync({ shouldPlayInBackground: true }), which only keeps
// the player's audio focus alive in the background and doesn't touch
// either service. Stripping both permissions and both services so the
// merged manifest doesn't advertise capabilities this app doesn't use.
const FOREGROUND_SERVICE_PERMISSIONS = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
];

const UNUSED_AUDIO_SERVICES = [
  "expo.modules.audio.service.AudioControlsService",
  "expo.modules.audio.service.AudioRecordingService",
];

const withStripUnusedAudioForegroundServices = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    manifest["uses-permission"] = manifest["uses-permission"] || [];
    for (const name of FOREGROUND_SERVICE_PERMISSIONS) {
      manifest["uses-permission"].push({
        $: { "android:name": name, "tools:node": "remove" },
      });
    }

    const application = manifest.application[0];
    application.service = application.service || [];
    for (const name of UNUSED_AUDIO_SERVICES) {
      application.service.push({
        $: { "android:name": name, "tools:node": "remove" },
      });
    }

    return config;
  });

module.exports = withStripUnusedAudioForegroundServices;
