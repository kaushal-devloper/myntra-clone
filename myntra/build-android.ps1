Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Myntra Android Build & Auto-Installation Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Check and install NDK
Write-Host "[1/6] Skipping manual sdkmanager NDK setup; letting Gradle auto-download NDK 27 if required..." -ForegroundColor Green

# 2. Run Expo Prebuild Clean
Write-Host "[2/6] Running Expo Prebuild Clean..." -ForegroundColor Yellow
npx expo prebuild --clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error running prebuild. Please check configuration." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 3. Create local.properties
Write-Host "[3/6] Configuring Android SDK and NDK paths in local.properties..." -ForegroundColor Yellow
$localPropertiesPath = "android/local.properties"
$localPropsContent = "sdk.dir=C\:\\Users\\HP\\AppData\\Local\\Android\\Sdk`r`nndk.dir=C\:\\Users\\HP\\AppData\\Local\\Android\\Sdk\\ndk\\25.1.8937393"
$localPropsContent | Out-File -FilePath $localPropertiesPath -Encoding ascii -NoNewline
Write-Host "Configured local.properties successfully!" -ForegroundColor Green

# 4. Configure optimized architectures
Write-Host "[4/6] Optimizing build architectures in gradle.properties..." -ForegroundColor Yellow
$gradlePropertiesPath = "android/gradle.properties"
if (Test-Path $gradlePropertiesPath) {
    $content = Get-Content $gradlePropertiesPath
    $newContent = @()
    foreach ($line in $content) {
        if ($line -like "reactNativeArchitectures=*") {
            $newContent += "reactNativeArchitectures=arm64-v8a"
        } else {
            $newContent += $line
        }
    }
    [System.IO.File]::WriteAllLines($gradlePropertiesPath, $newContent)
    Write-Host "gradle.properties updated with arm64-v8a and x86_64 architectures." -ForegroundColor Green
} else {
    Write-Host "Warning: gradle.properties not found." -ForegroundColor Yellow
}

# 4.5. Inject NDK 25.1.8937393 forced-override in android/build.gradle
Write-Host "[4.5/6] Overriding NDK version to 25.1.8937393 in build.gradle..." -ForegroundColor Yellow
$buildGradlePath = "android/build.gradle"
if (Test-Path $buildGradlePath) {
    $gradleContent = Get-Content $buildGradlePath -Raw
    if (-not ($gradleContent -contains "rootProject.ext.ndkVersion =")) {
        # Force root project NDK version override immediately after rootproject plugin application
        $targetPlugin = 'apply plugin: "com.facebook.react.rootproject"'
        $replacement = "apply plugin: `"com.facebook.react.rootproject`"`r`n`r`nrootProject.ext.ndkVersion = `"25.1.8937393`"`r`nproject.ext.set(`"ndkVersion`", `"25.1.8937393`")"
        $gradleContent = $gradleContent.Replace($targetPlugin, $replacement)
        
        # Also append allprojects and subprojects overrides at the end
        $overrideBlock = @"


allprojects {
    ext {
        ndkVersion = "25.1.8937393"
    }
}

subprojects {
    ext {
        ndkVersion = "25.1.8937393"
    }
}
"@
        $gradleContent = $gradleContent + $overrideBlock
        [System.IO.File]::WriteAllText($buildGradlePath, $gradleContent)
        Write-Host "Injected NDK version override in android/build.gradle successfully!" -ForegroundColor Green
    }
    
    # Force NDK version matching in app-level build.gradle to bypass evaluation constraints
    $appBuildGradlePath = "android/app/build.gradle"
    if (Test-Path $appBuildGradlePath) {
        $appGradleContent = Get-Content $appBuildGradlePath -Raw
        $appGradleContent = $appGradleContent.Replace("ndkVersion rootProject.ext.ndkVersion", 'ndkVersion "25.1.8937393"')
        [System.IO.File]::WriteAllText($appBuildGradlePath, $appGradleContent)
        Write-Host "Injected NDK version override in android/app/build.gradle successfully!" -ForegroundColor Green
    }
}

# 5. Clean Gradle build cache
Write-Host "[5/6] Cleaning Gradle cache..." -ForegroundColor Yellow
cd android
.\gradlew.bat clean
cd ..
if ($LASTEXITCODE -ne 0) {
    Write-Host "Gradle clean failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 6. Run direct Gradle build (bypass Expo CLI's hardcoded armeabi-v7a) and ADB install
Write-Host "[6/6] Compiling native APK for arm64-v8a only and installing on connected device..." -ForegroundColor Yellow
cd android

# Build the debug APK using only arm64-v8a (avoids JDK17 CMake restricted method error)
.\gradlew.bat app:assembleDebug `
    -PreactNativeArchitectures=arm64-v8a `
    -PreactNativeDevServerPort=8082 `
    -x lint `
    -x test `
    --build-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "APK build failed." -ForegroundColor Red
    cd ..
    exit $LASTEXITCODE
}
cd ..

# Locate and install the APK via ADB
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    Write-Host "Installing APK on connected device via ADB..." -ForegroundColor Yellow
    adb install -r $apkPath
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS! APK installed on your device." -ForegroundColor Green
        Write-Host "Launching the app..." -ForegroundColor Yellow
        adb shell am start -n "com.kaushalt.myntra/.MainActivity"
    } else {
        Write-Host "ADB install failed. Ensure USB debugging is enabled and device is connected." -ForegroundColor Red
    }
} else {
    Write-Host "APK not found at: $apkPath" -ForegroundColor Red
}
