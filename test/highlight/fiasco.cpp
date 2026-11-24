INTERFACE [x86 && !debug]:
// <- keyword
//         ^ constant
//             ^ operator
//                ^ operator
//                 ^ constant

EXTENSION class Counter { int value; };
// <- keyword

IMPLEMENTATION:
// <- keyword

PUBLIC inline NEEDS["counter.h"] int Counter::get() { return value; }
// <- keyword
//            ^ keyword
//                  ^ string
//                                            ^ function

IMPLEMENT_OVERRIDE inline NOEXPORT ALWAYS_INLINE void Counter::reset() {}
// <- keyword
//                        ^ keyword
//                                 ^ keyword

PRIVATE NEEDS[<cstdio>, "a.h"] void Counter::log() {}
//            ^ string
//                      ^ string
