// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "KokoroTTSKit",
    platforms: [
        .macOS(.v15),
        .iOS(.v17),
    ],
    products: [
        .library(name: "KokoroTTSKit", targets: ["KokoroTTSKit"]),
    ],
    targets: [
        .target(
            name: "KokoroTTSKit",
            path: "Sources/KokoroTTSKit",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
    ],
    swiftLanguageModes: [.v6])
