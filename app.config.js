const fs = require("fs");
const path = require("path");

const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || "";
const ringtonePath = path.join(__dirname, "assets/sounds/ride_request.wav");
const hasRingtone = fs.existsSync(ringtonePath);

module.exports = ({ config }) => ({
  ...config,
  owner: "anjalidivines-team",
  android: {
    ...config.android,
    googleServicesFile: "./google-services.json",
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: googleMapsKey,
      },
    },
    // Lets tapping a https://bogie.in/dr/<code> referral link open the app
    // directly (once bogie.in hosts the required Digital Asset Links
    // verification file — see deep-linking TODO in README).
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: "https", host: "bogie.in", pathPrefix: "/dr" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  ios: {
    ...config.ios,
    googleServicesFile: "./GoogleService-Info.plist",
    config: {
      ...config.ios?.config,
      googleMapsApiKey: googleMapsKey,
    },
    infoPlist: {
      ...config.ios?.infoPlist,
      NSContactsUsageDescription: "bogie Driver uses your contacts so you can quickly invite friends to refer them.",
      NSCameraUsageDescription: "bogie Driver uses your camera to capture document photos and scan QR codes.",
      NSMicrophoneUsageDescription: "bogie Driver uses your microphone for in-app voice notes during support chats.",
      NSLocationWhenInUseUsageDescription: "bogie Driver uses your location to receive nearby ride requests and navigate trips.",
    },
  },
  plugins: [
    ...(config.plugins || []),
    // Referencing app.plugin.js directly (instead of the bare package name)
    // works around an @expo/config-plugins resolver bug: it finds the
    // package's dist/module/package.json ({"type":"module"}) before the
    // real package root, so plugin resolution fails with a SyntaxError.
    "@react-native-firebase/app/app.plugin.js",
    "@react-native-firebase/crashlytics/app.plugin.js",
    "@react-native-firebase/perf/app.plugin.js",
    "./plugins/withDisableAndroidBackup.js",
    "expo-secure-store",
    // Bundles ride_request.wav as a native notification sound (Android raw
    // resource / iOS bundle resource). Guarded on the file existing so a
    // missing sound file can't break `expo prebuild` / EAS builds.
    ...(hasRingtone ? [["expo-notifications", { sounds: ["./assets/sounds/ride_request.wav"] }]] : []),
  ],
});