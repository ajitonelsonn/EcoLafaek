# Testing EcoLafaek on iOS

Since the app is not yet published on the App Store, you can test it by building from source.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Flutter SDK** - [Install Flutter](https://docs.flutter.dev/get-started/install)
- **Xcode** - Download from the Mac App Store
- **CocoaPods** - Run `sudo gem install cocoapods`
- **Git** - For cloning the repository

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/ajitonelsonn/EcoLafaek.git
cd EcoLafaek/ecolafaek
```

### 2. Create Environment Configuration

Create a `.env` file in the `ecolafaek/` directory:

```bash
API_BASE_URL=https://www.ecolafaek.xyz
```

### 3. Install Dependencies

```bash
flutter pub get
cd ios
pod install
cd ..
```

### 4. Open in Xcode

```bash
open ios/Runner.xcworkspace
```

### 5. Configure Signing

In Xcode:

1. Select the **Runner** project in the navigator
2. Go to **Signing & Capabilities** tab
3. Select your **Team** (you may need an Apple Developer account)
4. Xcode will automatically manage provisioning profiles

### 6. Run on iOS Device or Simulator

**For Simulator:**

```bash
flutter run
```

**For Physical iPhone:**

1. Connect your iPhone via USB
2. Trust the computer on your iPhone
3. Run:

```bash
flutter run -d <device-id>
```

To see available devices:

```bash
flutter devices
```

## Test Credentials

You can use the following test account or register a new one:

**Test Account:**

- You can register a new account directly in the app

**Or register a new account** through the app's registration flow.

## Troubleshooting

### CocoaPods Issues

```bash
cd ios
pod repo update
pod install
cd ..
```

### Flutter Doctor

Check your Flutter installation:

```bash
flutter doctor
```

### Clean Build

If you encounter build issues:

```bash
flutter clean
flutter pub get
cd ios
pod install
cd ..
flutter run
```

### Login Credentials

| Username | Password |
| -------- | -------- |
| usertest | 1234abcd |

## Need Help?

- **Project Issues**: [GitHub Issues](https://github.com/ajitonelsonn/EcoLafaek/issues)
- **Docs**: [https://docs.ecolafaek.com](https://docs.ecolafaek.com)

---

**Note**: The app requires iOS 12.0 or later.
