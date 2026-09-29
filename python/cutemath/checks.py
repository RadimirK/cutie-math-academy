"""Checkers for answer types with check: 'python' (see src/answer-types/core.ts).

Each checker returns {'ok': bool} or {'parseError': str}.
"""
import random

import sympy

from .parse import DNE, AnswerParseError, parse

REL_TOL = sympy.Float('1e-9')
SAMPLE_POINTS = 8
MIN_VALID_POINTS = 3


def _ok(value):
    return {'ok': bool(value)}


def _parse_pair(user, correct):
    try:
        u = parse(user)
    except AnswerParseError as e:
        return None, None, {'parseError': str(e)}
    return u, parse(correct), None


def _as_expr(value, what):
    if isinstance(value, list):
        raise AnswerParseError(f'ожидалось {what}, а не список')
    return value


# ---------- expression ----------
#
# The numeric test on real points is the primary judge: simplify() works over the complex
# numbers and would reject e.g. ln(x^2)/2 == ln(x), which is fine on the real domain where
# both sides are defined. simplify() is used only when too few sample points are valid.

def _sample_value(rng):
    v = sympy.Rational(rng.randint(300, 2700), 1000)
    return v if rng.random() < 0.5 else -v


def _numeric_verdict(u, c, variables):
    """True/False when enough sample points are valid, None when the test is inconclusive."""
    rng = random.Random(20260929)
    valid = 0
    for _ in range(SAMPLE_POINTS * 5):
        point = {v: _sample_value(rng) for v in variables}
        try:
            uv = sympy.N(u.subs(point), 30)
            cv = sympy.N(c.subs(point), 30)
        except (TypeError, ValueError, ZeroDivisionError):
            continue
        if not (uv.is_number and cv.is_number) or not (uv.is_finite and cv.is_finite):
            continue
        if abs(sympy.im(cv)) > REL_TOL or abs(sympy.im(uv)) > REL_TOL:
            continue
        valid += 1
        if abs(sympy.re(uv) - sympy.re(cv)) > REL_TOL * max(1, abs(cv)):
            return False
        if valid >= SAMPLE_POINTS:
            break
    return True if valid >= MIN_VALID_POINTS else None


def _symbolic_verdict(u, c):
    real = {s: sympy.Symbol(s.name, real=True) for s in u.free_symbols | c.free_symbols}
    diff = (u - c).subs(real)
    if sympy.simplify(diff) == 0:
        return True
    return diff.equals(0) is True


def check_expression(user, correct, cfg, stage='full'):
    """stage: 'full' (CI), or 'numeric' then 'symbolic' (browser, symbolic under a timeout)."""
    u, c, err = _parse_pair(user, correct)
    if err:
        return err
    try:
        u, c = _as_expr(u, 'выражение'), _as_expr(c, 'выражение')
    except AnswerParseError as e:
        return {'parseError': str(e)}
    allowed = {sympy.Symbol(v) for v in cfg.get('variables', [])} | c.free_symbols
    extra = u.free_symbols - allowed
    if extra:
        names = ', '.join(sorted(str(s) for s in extra))
        return {'parseError': f'в ответе есть лишние переменные: {names}'}

    if stage != 'symbolic':
        numeric = _numeric_verdict(u, c, sorted(allowed | u.free_symbols, key=str))
        if numeric is not None:
            return _ok(numeric)
        if stage == 'numeric':
            # Inconclusive: the worker runs stage='symbolic' next, rejecting on timeout.
            return {'ok': False, 'needsSymbolic': True}
    return _ok(_symbolic_verdict(u, c))


# ---------- number ----------

_SPECIAL = (sympy.oo, -sympy.oo, sympy.zoo, DNE)


def check_number(user, correct, cfg):
    u, c, err = _parse_pair(user, correct)
    if err:
        return err
    try:
        u, c = _as_expr(u, 'число'), _as_expr(c, 'число')
    except AnswerParseError as e:
        return {'parseError': str(e)}
    if u.free_symbols - {DNE}:
        return {'parseError': 'ожидалось число, а в ответе есть переменные'}
    if u in _SPECIAL or c in _SPECIAL:
        return _ok(u == c)
    return _ok(_numbers_equal(u, c))


def _numbers_equal(u, c):
    if u == c:
        return True
    diff = sympy.simplify(u - c)
    if diff == 0:
        return True
    value = sympy.N(diff, 50)
    return value.is_number and abs(value) < sympy.Float('1e-40')


# ---------- matrix ----------

def _shape(m):
    if not isinstance(m, list) or not m or not all(isinstance(r, list) for r in m):
        return None
    cols = {len(r) for r in m}
    return (len(m), cols.pop()) if len(cols) == 1 and 0 not in cols else None


def check_matrix(user, correct, cfg):
    u, c, err = _parse_pair(user, correct)
    if err:
        return err
    if _shape(u) is None:
        return {'parseError': 'ожидалась прямоугольная матрица'}
    if _shape(u) != _shape(c):
        return _ok(False)
    for ur, cr in zip(u, c):
        for ue, ce in zip(ur, cr):
            if isinstance(ue, list):
                return {'parseError': 'элемент матрицы не является числом'}
            if not _numbers_equal(ue, ce):
                return _ok(False)
    return _ok(True)


# ---------- registry ----------

CHECKERS = {
    'expression': check_expression,
    'number': check_number,
    'matrix': check_matrix,
}


def check(answer_type, user, correct, cfg=None, stage='full'):
    cfg = cfg or {}
    if answer_type not in CHECKERS:
        raise KeyError(f'нет Python-проверяющего для типа {answer_type}')
    if answer_type == 'expression':
        return check_expression(user, correct, cfg, stage)
    return CHECKERS[answer_type](user, correct, cfg)


def wrong(answer_type, correct, cfg=None):
    """A certainly-wrong answer for the template self-test."""
    if answer_type == 'matrix':
        m = parse(correct)
        m[0][0] = m[0][0] + 1
        return str(m)
    c = parse(correct)
    if answer_type == 'number':
        if c == DNE:
            return '0'
        if c in (sympy.oo, -sympy.oo):
            return str(-c)
    return f'({correct}) + 1'
