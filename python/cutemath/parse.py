"""Parsing of answers in sympy syntax.

Answers reach Python as strings: reference answers from templates and generators, user
answers from the MathJSON -> sympy converter on the client. sympy's LaTeX parser is not used.
"""
import sympy
from sympy.parsing.sympy_parser import (
    auto_number,
    auto_symbol,
    factorial_notation,
    parse_expr,
    rationalize,
)

# "Does not exist" answers (limits of divergent sequences, etc).
DNE = sympy.Symbol('DNE')

_FUNCTIONS = {
    name: getattr(sympy, name)
    for name in (
        'exp', 'log', 'sqrt', 'real_root', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
        'asin', 'acos', 'atan', 'acot', 'sinh', 'cosh', 'tanh', 'Abs', 'factorial', 'binomial',
        'floor', 'ceiling',
        'Rational', 'Integer', 'pi', 'E', 'I', 'oo', 'zoo', 'Matrix',
    )
}
# Single capital letters are variables, not sympy's N(), S, O(), Q...; E and I stay constants.
_LETTERS = {c: sympy.Symbol(c) for c in 'ABCDFGHJKLMNOPQRSTUVWXYZ'}
_LOCALS = {**_LETTERS, **_FUNCTIONS, 'ln': sympy.log, 'e': sympy.E, 'DNE': DNE}
# rationalize turns 0.5 into 1/2, so decimal user input is compared exactly.
_TRANSFORMS = (auto_symbol, auto_number, factorial_notation, rationalize)


class AnswerParseError(ValueError):
    pass


def parse(text):
    """Parses an expression, or a (nested) list literal of expressions."""
    if not isinstance(text, str) or not text.strip():
        raise AnswerParseError('пустой ответ')
    try:
        value = parse_expr(text, local_dict=dict(_LOCALS), transformations=_TRANSFORMS, evaluate=True)
    except Exception as e:  # noqa: BLE001 - sympy raises anything from SyntaxError to TypeError
        raise AnswerParseError(f'не удалось разобрать «{text}»: {e}') from None
    return _sympify_tree(value)


def _sympify_tree(value):
    if isinstance(value, (list, tuple)):
        return [_sympify_tree(v) for v in value]
    if isinstance(value, sympy.MatrixBase):
        return [[value[i, j] for j in range(value.cols)] for i in range(value.rows)]
    try:
        return sympy.sympify(value)
    except sympy.SympifyError as e:
        raise AnswerParseError(str(e)) from None


def format_answer(value):
    """Serializes a generator's answer (sympy objects, lists, matrices) back to sympy syntax."""
    if isinstance(value, sympy.MatrixBase):
        value = value.tolist()
    if isinstance(value, (list, tuple)):
        return '[' + ', '.join(format_answer(v) for v in value) + ']'
    return sympy.sstr(sympy.sympify(value))
