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

module.exports = grammar(CPP, {
  name: 'fpp',

  conflicts: ($, original) => original.concat([
    [$._declaration_modifiers, $._fiasco_member_modifier],
    [$.sized_type_specifier, $.call_expression],
    [$._declaration_specifiers, $.fiasco_template_modifiers, $._constructor_specifiers],
    [$.fiasco_template_modifiers],
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
      optional($.fiasco_template_modifiers),
      original,
    ),

    fiasco_section: $ => seq(
      choice('INTERFACE', 'IMPLEMENTATION'),
      optional(seq('[', field('condition', $.fiasco_tag_expression), ']')),
      ':',
    ),

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
    // `IMPLEMENT static inline template<...>`.
    fiasco_template_modifiers: $ => repeat1(choice(
      $._fiasco_member_modifier,
      $._declaration_modifiers,
    )),

    _fiasco_member_modifier: _ => choice(
      'PUBLIC',
      'PROTECTED',
      'PRIVATE',
      'IMPLEMENT',
      'IMPLEMENT_DEFAULT',
      'IMPLEMENT_OVERRIDE',
    ),

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
      'PUBLIC',
      'PROTECTED',
      'PRIVATE',
      'IMPLEMENT',
      'IMPLEMENT_DEFAULT',
      'IMPLEMENT_OVERRIDE',
      'NOEXPORT',
      'ALWAYS_INLINE',
      $.fiasco_needs,
    ),

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
      optional($.fiasco_template_modifiers),
      original,
    ),

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
