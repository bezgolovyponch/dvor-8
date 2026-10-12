#!/bin/sh
# Builds the Android app: the game's own files, unchanged, inside a window that shows them.
#
#   sh android/build.sh            → android/out/dvor-8-<version>.apk
#
# No Gradle and no dependencies: the Android SDK's own tools, one after another. Needs a JDK and the SDK
# with `platforms;android-35` and `build-tools;35.0.0` (sdkmanager installs both).
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(dirname "$HERE")
SDK=${ANDROID_HOME:-$HOME/Library/Android/sdk}
BT=$SDK/build-tools/35.0.0; JAR=$SDK/platforms/android-35/android.jar
VERSION=${VERSION:-0.4.0}; CODE=${CODE:-4}
# The key every build is signed with. A phone only installs an update over a build signed with the same
# key, so it is made once and kept outside the repository.
KEY=${KEY:-$HOME/.android/dvor8.keystore}
OUT=$HERE/out; WORK=$OUT/work
rm -rf "$WORK"; mkdir -p "$WORK/assets/www" "$WORK/classes" "$WORK/gen" "$WORK/dex"

# the game: exactly what the web server serves, and nothing else
cp "$ROOT/index.html" "$ROOT/style.css" "$WORK/assets/www/"
cp -R "$ROOT/src" "$ROOT/vendor" "$WORK/assets/www/"

"$BT/aapt2" compile --dir "$HERE/res" -o "$WORK/res.zip"
"$BT/aapt2" link -o "$WORK/base.apk" -I "$JAR" --manifest "$HERE/AndroidManifest.xml" -A "$WORK/assets" --java "$WORK/gen" \
  --min-sdk-version 26 --target-sdk-version 34 --version-code "$CODE" --version-name "$VERSION" \
  -0 wasm -0 tflite "$WORK/res.zip"
javac --release 11 -Xlint:-options -cp "$JAR" -d "$WORK/classes" $(find "$HERE/src" "$WORK/gen" -name '*.java')
"$BT/d8" --release --lib "$JAR" --min-api 26 --output "$WORK/dex" $(find "$WORK/classes" -name '*.class')
(cd "$WORK/dex" && zip -q -j "$WORK/base.apk" classes.dex)
"$BT/zipalign" -f -p 4 "$WORK/base.apk" "$WORK/aligned.apk"
if [ ! -f "$KEY" ]; then
  mkdir -p "$(dirname "$KEY")"
  keytool -genkeypair -keystore "$KEY" -storepass android -keypass android -alias dvor8 -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=DVOR-8"
fi
APK=$OUT/dvor-8-$VERSION.apk
"$BT/apksigner" sign --ks "$KEY" --ks-pass pass:android --key-pass pass:android --ks-key-alias dvor8 --out "$APK" "$WORK/aligned.apk"
"$BT/apksigner" verify "$APK"
rm -rf "$WORK" "$APK.idsig"
ls -l "$APK"
