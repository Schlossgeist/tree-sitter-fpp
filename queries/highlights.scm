; Fiasco preprocess

[
 "INTERFACE"
 "IMPLEMENTATION"
 "EXTENSION"
 "PUBLIC"
 "PROTECTED"
 "PRIVATE"
 "IMPLEMENT"
 "IMPLEMENT_DEFAULT"
 "IMPLEMENT_OVERRIDE"
 "NOEXPORT"
 "ALWAYS_INLINE"
 "NEEDS"
] @keyword

(fiasco_tag_expression
  (identifier) @constant)

(fiasco_tag_expression
  ["!" "&" "|" "-" "&&" "," "||"] @operator)

(fiasco_needs
  [(string_literal) (system_lib_string)] @string)
