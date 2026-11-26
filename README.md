# tree-sitter-fpp

Grammar of Fiasco's Preprocess C++ dialect for [tree-sitter](https://github.com/tree-sitter/tree-sitter).

The grammar extends [tree-sitter-cpp](https://github.com/tree-sitter/tree-sitter-cpp) the same way tree-sitter-cpp extends tree-sitter-c: `grammar.js` contains only the Fiasco additions and the few rules it changes, and the C++ base is pinned to a tree-sitter-cpp commit in `package.json`. (The pin is a commit because the newest tree-sitter-cpp release, v0.23.4, predates features this grammar's tests rely on; switch to a version range once a newer release is tagged.) tree-sitter-c, which tree-sitter-cpp extends, is pinned to the commit of its v0.24.2 release (which is not on npm), and an npm override makes tree-sitter-cpp use that version too, so a new tree-sitter-c release cannot change the generated parser unnoticed. The highlight queries are layered in the same way (C, then C++, then `queries/highlights.scm`).

This grammar also parses the [Fiasco preprocessor language extensions](https://github.com/kernkonzept/fiasco/blob/master/tool/preprocess/doc/manpage.dox), including section headers and tag expressions, class extensions, member attributes, and `NEEDS` dependencies. Section headers are represented as `fiasco_interface_section` and `fiasco_implementation_section` nodes (both subtypes of the `fiasco_section` supertype) followed by their C++ declarations; conditional selection and preprocessing are not performed by the parser. Member modifiers are represented as `fiasco_visibility_specifier` (`PUBLIC`, `PROTECTED`, `PRIVATE`), `fiasco_implement_specifier` (`IMPLEMENT`, `IMPLEMENT_DEFAULT`, `IMPLEMENT_OVERRIDE`), and `fiasco_inline_specifier` (`NOEXPORT`, `ALWAYS_INLINE`) nodes.

Section tag expressions support negation (`!`), conjunction (`-`, `&&`, `&`), disjunction (`,`, `||`, `|`), and grouping with braces or parentheses. As in the preprocessor, bitwise operators bind more tightly than logical operators, and conjunction binds more tightly than disjunction.

## References

- [Hyperlinked C++ BNF Grammar](http://www.nongnu.org/hcb/)
- [EBNF Syntax: C++](http://www.externsoft.ch/download/cpp-iso.html)
- [Preprocess - A preprocessor for C and C++ modules](https://os.inf.tu-dresden.de/~hohmuth/prj/preprocess/)
