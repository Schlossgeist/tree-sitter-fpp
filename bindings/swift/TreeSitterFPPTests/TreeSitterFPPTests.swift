import XCTest
import SwiftTreeSitter
import TreeSitterFPP

final class TreeSitterFPPTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_fpp())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading FPP grammar")
    }
}
