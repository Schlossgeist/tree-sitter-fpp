// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "TreeSitterFPP",
    products: [
        .library(name: "TreeSitterFPP", targets: ["TreeSitterFPP"]),
    ],
    dependencies: [
        .package(url: "https://github.com/tree-sitter/swift-tree-sitter", from: "0.9.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterFPP",
            dependencies: [],
            path: ".",
            sources: [
                "src/parser.c",
                "src/scanner.c",
            ],
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterFPPTests",
            dependencies: [
                .product(name: "SwiftTreeSitter", package: "swift-tree-sitter"),
                "TreeSitterFPP",
            ],
            path: "bindings/swift/TreeSitterFPPTests"
        )
    ],
    cLanguageStandard: .c11
)
