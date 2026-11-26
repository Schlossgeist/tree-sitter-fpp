/**
 * @file FPP grammar for tree-sitter: Fiasco's Preprocess C++ dialect,
 *       as an extension of tree-sitter-cpp.
 * @author Nick Naumann <nick.naumann@mailbox.tu-dresden.de>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const CPP = require('tree-sitter-cpp/grammar');

const commaSep1 = (rule) => seq(rule, repeat(seq(',', rule)));

// A section header, e.g. `INTERFACE [ia32,amd64]:`.
const fiascoSection = ($, keyword) => seq(
  keyword,
  optional(seq('[', field('condition', $.fiasco_tag_expression), ']')),
  ':',
);

// Copied from tree-sitter-c: the pointer declarators, with attributes after
// the '*': `int * [[maybe_unused]] p`, and GNU attributes among the
// qualifiers, `Foo * __attribute__((nonnull)) f()`.  Remove once
// tree-sitter-c has them (tree-sitter/tree-sitter-c#301, #331).
const pointerDeclarator = ($, declarator) => prec.dynamic(1, prec.right(seq(
  optional($.ms_based_modifier),
  '*',
  repeat($.attribute_declaration),
  repeat($.ms_pointer_modifier),
  repeat(choice($.type_qualifier, $.attribute_specifier)),
  field('declarator', declarator),
)));

module.exports = grammar(CPP, {
  name: 'fpp',

  supertypes: ($, original) => original.concat([
    $.fiasco_section,
  ]),

  conflicts: ($, original) => original.concat([
    [$.sized_type_specifier, $.call_expression],
    [$._declaration_specifiers, $.linkage_specification, $.template_declaration, $._constructor_specifiers],
    [$.linkage_specification, $.template_declaration, $._constructor_specifiers],
    [$._string, $.concatenated_string],
  ]),

  rules: {
    _top_level_item: ($, original) => choice(
      original,
      $.fiasco_section,
      $.fiasco_extension,
    ),

    // FPP keywords before a linkage specification, e.g.
    // `IMPLEMENT extern "C" void f()`.
    linkage_specification: ($, original) => seq(
      optional($._fiasco_leading_specifiers),
      original,
    ),

    // Either kind of section header; a supertype, so it is not in the tree
    // itself, but `(fiasco_section)` in a query matches both.
    fiasco_section: $ => choice(
      $.fiasco_interface_section,
      $.fiasco_implementation_section,
    ),

    fiasco_interface_section: $ => fiascoSection($, 'INTERFACE'),

    fiasco_implementation_section: $ => fiascoSection($, 'IMPLEMENTATION'),

    // Tags are plain words that may start with a digit, e.g. `32bit`.
    fiasco_tag: _ => /[A-Za-z0-9_]+/,

    fiasco_tag_expression: $ => choice(
      alias($.fiasco_tag, $.identifier),
      prec(5, seq('!', $.fiasco_tag_expression)),
      prec.left(4, seq($.fiasco_tag_expression, '&', $.fiasco_tag_expression)),
      prec.left(3, seq($.fiasco_tag_expression, '|', $.fiasco_tag_expression)),
      prec.left(2, seq($.fiasco_tag_expression, choice('-', '&&'), $.fiasco_tag_expression)),
      prec.left(1, seq($.fiasco_tag_expression, choice(',', '||'), $.fiasco_tag_expression)),
      seq('{', $.fiasco_tag_expression, '}'),
      seq('(', $.fiasco_tag_expression, ')'),
    ),

    fiasco_extension: $ => seq(
      'EXTENSION',
      choice($.class_specifier, $.struct_specifier),
      ';',
    ),

    // Preprocess accepts specifiers before a template head in any order, e.g.
    // `PUBLIC inline template<...>`, `inline template<...>` or
    // `IMPLEMENT static inline template<...>`, and before a linkage
    // specification, also 'explicit' (a constructor specifier, no
    // declaration modifier): `PUBLIC explicit template<...>`.  Hidden: they
    // are children of the template declaration or linkage specification,
    // like the specifiers of a function.
    _fiasco_leading_specifiers: $ => repeat1(choice(
      $._declaration_modifiers,
      $.explicit_function_specifier,
    )),

    // The visibility of a member declared outside its class, e.g.
    // `PUBLIC int A::f()`.
    fiasco_visibility_specifier: _ => choice('PUBLIC', 'PROTECTED', 'PRIVATE'),

    // A member that is only implemented here, e.g. `IMPLEMENT int A::f()`,
    // or a default implementation and its replacement.
    fiasco_implement_specifier: _ => choice(
      'IMPLEMENT',
      'IMPLEMENT_DEFAULT',
      'IMPLEMENT_OVERRIDE',
    ),

    // Specifiers for inline functions: `inline NOEXPORT`, `inline ALWAYS_INLINE`.
    fiasco_inline_specifier: _ => choice('NOEXPORT', 'ALWAYS_INLINE'),

    fiasco_needs: $ => seq(
      'NEEDS', '[', commaSep1(choice(
        $.string_literal,
        $.system_lib_string,
        $.identifier,
        $.qualified_identifier,
      )), ']',
    ),

    _declaration_modifiers: ($, original) => choice(
      original,
      $.fiasco_visibility_specifier,
      $.fiasco_implement_specifier,
      $.fiasco_inline_specifier,
      $.fiasco_needs,
    ),

    // After two modifiers, `inline constexpr explicit A::A(int) {}` is also
    // a function with the return type 'explicit' (a keyword that is not
    // valid there becomes an identifier).  Both parses end up in the same
    // state, and without a dynamic precedence the declaration wins.  (Not
    // on the whole constructor: `FOO(x) = 0;` in a block would become a
    // pure virtual constructor.)  Remove once tree-sitter-cpp has it (not
    // reported upstream yet).
    explicit_function_specifier: ($, original) => prec.dynamic(1, original),

    // Copied from tree-sitter-cpp: allow an enum base on anonymous enums.
    enum_specifier: $ => prec.right(seq(
      'enum',
      optional(choice('class', 'struct')),
      choice(
        seq(
          field('name', $._class_name),
          optional($._enum_base_clause),
          optional(field('body', $.enumerator_list)),
        ),
        seq(
          optional($._enum_base_clause),
          field('body', $.enumerator_list),
        ),
      ),
      optional($.attribute_specifier),
    )),

    // Member modifiers before the template head, e.g.
    // `PUBLIC inline template<..>`.
    template_declaration: ($, original) => seq(
      optional($._fiasco_leading_specifiers),
      original,
    ),

    pointer_declarator: $ => pointerDeclarator($, $._declarator),
    pointer_field_declarator: $ => pointerDeclarator($, $._field_declarator),
    pointer_type_declarator: $ => pointerDeclarator($, $._type_declarator),
    abstract_pointer_declarator: $ => prec.dynamic(1, prec.right(seq(
      '*',
      repeat($.attribute_declaration),
      repeat($.ms_pointer_modifier),
      repeat(choice($.type_qualifier, $.attribute_specifier)),
      field('declarator', optional($._abstract_declarator)),
    ))),

    // Copied from tree-sitter-cpp: any abstract declarator.
    optional_parameter_declaration: $ => seq(
      $._declaration_specifiers,
      field('declarator', optional(choice($._declarator, $._abstract_declarator))),
      '=',
      field('default_value', $.expression),
    ),

    // GNU: `T name asm("label") __attribute__((...)) = value`
    init_declarator: ($, original) => choice(
      original,
      seq(
        field('declarator', $._declarator),
        $.gnu_asm_expression,
        repeat($.attribute_specifier),
        '=',
        field('value', choice($.initializer_list, $.expression)),
      ),
    ),

    // A function with a return type may be '= default' or '= delete'
    // outside a class body as well: `void f(double) = delete;`, a friend
    // `friend bool operator==(X, X) = default;`, or FPP's out-of-class
    // member declarations (`PUBLIC X & A::f() && = delete;`).
    // tree-sitter-cpp takes the clause for an initializer.  Remove once
    // tree-sitter-cpp has it (tree-sitter/tree-sitter-cpp#351, #375).
    function_definition: ($, original) => ({
      ...original,
      members: original.members.map((e) => e.name !== 'body' ? e : choice(
        e,
        $.default_method_clause,
        $.delete_method_clause,
      )),
    }),

    // `Foo::Foo() = default;` outside a class is also an assignment
    // expression to an identifier 'default'.  Prefer the clause.  Remove
    // once tree-sitter-cpp has it (tree-sitter/tree-sitter-cpp#357).
    default_method_clause: _ => prec.dynamic(1, seq('=', 'default', ';')),

    // Functional cast with a single-keyword type, e.g. `unsigned (x)`.
    call_expression: ($, original) => choice(
      original,
      prec.dynamic(1, seq(
        field('function', alias(
          choice('signed', 'unsigned', 'long', 'short'),
          $.sized_type_specifier,
        )),
        field('arguments', $.argument_list),
      )),
    ),

    // Copied from tree-sitter-cpp: macros expanding to string literals,
    // e.g. `" " COLOR(green) "x"`.  (A concatenation starting with a macro
    // call would make every call expression ambiguous.)
    concatenated_string: $ => choice(
      prec.right(seq(
        choice($.identifier, $.string_literal, $.raw_string_literal),
        choice($.string_literal, $.raw_string_literal),
        repeat(choice(
          $.identifier,
          alias($._string_macro_call, $.call_expression),
          $.string_literal,
          $.raw_string_literal,
        )),
      )),
      prec.right(seq(
        choice($.string_literal, $.raw_string_literal),
        alias($._string_macro_call, $.call_expression),
        repeat(choice(
          $.identifier,
          alias($._string_macro_call, $.call_expression),
          $.string_literal,
          $.raw_string_literal,
        )),
      )),
    ),

    _string_macro_call: $ => prec(1, seq(
      field('function', $.identifier),
      field('arguments', $.argument_list),
    )),
  },
});
