#!/bin/bash
set -e

echo "=== Configurando Android SDK ==="
mkdir -p /home/neto/Android/Sdk/cmdline-tools
cd /home/neto/Android/Sdk/cmdline-tools

if [ ! -d "latest" ]; then
    echo "Baixando cmdline-tools..."
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip
    echo "Extraindo..."
    unzip -q cmdline-tools.zip
    mv cmdline-tools latest
    rm cmdline-tools.zip
fi

echo "Aceitando licenças do Android..."
yes | ./latest/bin/sdkmanager --licenses > /dev/null 2>&1

echo "Instalando plataformas e build-tools..."
./latest/bin/sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

export ANDROID_HOME=/home/neto/Android/Sdk

echo "=== Compilando o App ==="
cd /media/neto/PARTICULAR/AppAntgravit
npm run build
npx cap sync android
cd android
./gradlew assembleDebug

echo "=== Concluído! O APK está em android/app/build/outputs/apk/debug/app-debug.apk ==="
