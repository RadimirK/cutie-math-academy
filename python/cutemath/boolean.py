"""Boolean-function helpers for discrete-math generators.

A function of n arguments is its truth vector: a tuple of 2**n bits in lexicographic order
of the argument sets (00…0, 00…1, …, 11…1), so the first argument is the most significant bit.
Formulas are nested tuples: ('var', i), ('not', f) or (op, f, g) with op from BINARY.
"""
from itertools import product

NAMES = ('x', 'y', 'z', 't')

# op -> (LaTeX, function on bits)
BINARY = {
    'and': ('\\wedge', lambda a, b: a & b),
    'or': ('\\vee', lambda a, b: a | b),
    'imp': ('\\to', lambda a, b: (1 - a) | b),
    'xor': ('\\oplus', lambda a, b: a ^ b),
    'eq': ('\\equiv', lambda a, b: 1 - (a ^ b)),
    'nand': ('\\mid', lambda a, b: 1 - (a & b)),
    'nor': ('\\downarrow', lambda a, b: 1 - (a | b)),
}


def points(n):
    return list(product((0, 1), repeat=n))


# ---------- formulas ----------

def evaluate(f, point):
    if f[0] == 'var':
        return point[f[1]]
    if f[0] == 'not':
        return 1 - evaluate(f[1], point)
    return BINARY[f[0]][1](evaluate(f[1], point), evaluate(f[2], point))


def truth_vector(f, n):
    return tuple(evaluate(f, p) for p in points(n))


def to_tex(f, top=True):
    if f[0] == 'var':
        return NAMES[f[1]]
    if f[0] == 'not':
        inner = to_tex(f[1], top=False)
        return f'\\neg {inner}'
    s = f'{to_tex(f[1], top=False)} {BINARY[f[0]][0]} {to_tex(f[2], top=False)}'
    return s if top else f'({s})'


def depends_on(v, n, j):
    """Whether the function essentially depends on its j-th argument."""
    bit = 1 << (n - 1 - j)
    return any(v[i] != v[i ^ bit] for i in range(len(v)))


def random_formula(rng, n, ops, binary_count, negation_rate=0.3):
    """A random formula with `binary_count` binary connectives whose function essentially
    depends on all n variables."""
    def build(k):
        if k == 0:
            node = ('var', rng.randrange(n))
        else:
            left = rng.randint(0, k - 1)
            node = (rng.choice(ops), build(left), build(k - 1 - left))
        return ('not', node) if rng.random() < negation_rate else node

    if binary_count + 1 < n:
        raise ValueError(f'в формуле с {binary_count} связками не уместить {n} переменных')
    for _ in range(10_000):
        f = build(binary_count)
        v = truth_vector(f, n)
        if all(depends_on(v, n, j) for j in range(n)):
            return f
    raise ValueError('не удалось построить формулу')


# ---------- truth vectors ----------

def vector_str(v):
    return ''.join(map(str, v))


def random_vector(rng, n, nonconstant=True):
    while True:
        v = tuple(rng.randint(0, 1) for _ in range(2 ** n))
        if not nonconstant or len(set(v)) == 2:
            return v


def table_tex(v, n):
    """Truth table of a vector as a display-math LaTeX array."""
    names = NAMES[:n]
    head = ' & '.join(names) + ' & f'
    rows = ' \\\\ '.join(' & '.join(map(str, p)) + f' & {b}' for p, b in zip(points(n), v))
    return f'$$\\begin{{array}}{{{"c" * n}|c}} {head} \\\\ \\hline {rows} \\end{{array}}$$'


def grid(v, n):
    """Truth vector as a matrix answer: one row for n = 2, rows by x for n = 3."""
    v = list(v)
    if n <= 2:
        return [v]
    half = len(v) // 2
    return [v[:half], v[half:]]


# ---------- Zhegalkin polynomial ----------

def zhegalkin(v, n):
    """Monomials of the reduced Zhegalkin polynomial, each a tuple of variable indices
    (() is the constant 1), sorted by degree descending, then lexicographically."""
    a = list(v)
    for j in range(n):
        bit = 1 << (n - 1 - j)
        for mask in range(2 ** n):
            if mask & bit:
                a[mask] ^= a[mask ^ bit]
    monomials = [tuple(j for j in range(n) if mask & (1 << (n - 1 - j))) for mask in range(2 ** n) if a[mask]]
    return sorted(monomials, key=lambda m: (-len(m), m))


def zhegalkin_tex(monomials):
    if not monomials:
        return '0'
    return ' \\oplus '.join(''.join(NAMES[j] for j in m) or '1' for m in monomials)


def zhegalkin_sympy(monomials):
    """The polynomial with ⊕ written as + (the reduced form is unique, so it can be
    compared as an ordinary polynomial)."""
    if not monomials:
        return '0'
    return ' + '.join('*'.join(NAMES[j] for j in m) or '1' for m in monomials)


# ---------- Post classes ----------

def preserves_0(v, n):
    return v[0] == 0


def preserves_1(v, n):
    return v[-1] == 1


def is_monotone(v, n):
    ps = points(n)
    return all(
        v[i] <= v[j]
        for i, p in enumerate(ps)
        for j, q in enumerate(ps)
        if all(a <= b for a, b in zip(p, q))
    )


def is_self_dual(v, n):
    # f(¬x) = ¬f(x): the vector read backwards is the negated vector.
    return all(v[i] != v[-1 - i] for i in range(len(v)))


def is_linear(v, n):
    return all(len(m) <= 1 for m in zhegalkin(v, n))


POST_CLASSES = [
    ('T_0', preserves_0),
    ('T_1', preserves_1),
    ('M', is_monotone),
    ('S', is_self_dual),
    ('L', is_linear),
]


# ---------- other properties ----------

def dual(v):
    """f*(x) = ¬f(¬x): the vector read backwards and negated."""
    return tuple(1 - b for b in reversed(v))


def essential_count(v, n):
    return sum(depends_on(v, n, j) for j in range(n))


def is_symmetric(v, n):
    by_weight = {}
    for p, b in zip(points(n), v):
        if by_weight.setdefault(sum(p), b) != b:
            return False
    return True


def is_forcible(v, n):
    """Some x_i = c turns f into a constant."""
    ps = points(n)
    return any(
        len({b for p, b in zip(ps, v) if p[i] == c}) == 1
        for i in range(n)
        for c in (0, 1)
    )


def minimal_ones(v, n):
    ones = [p for p, b in zip(points(n), v) if b]
    return [p for p in ones if not any(q != p and all(a <= b for a, b in zip(q, p)) for q in ones)]


def closed_under(v, n, op):
    """Whether the set of ones is closed under the componentwise application of op
    (a function of 2 or 3 bits)."""
    ones = [p for p, b in zip(points(n), v) if b]
    ones_set = set(ones)
    arity = op.__code__.co_argcount
    return all(
        tuple(op(*bits) for bits in zip(*args)) in ones_set
        for args in product(ones, repeat=arity)
    )


def maj(a, b, c):
    return (a & b) | (b & c) | (a & c)


# ---------- CNF ----------
# A clause is a tuple of literals (i, positive): variable index and whether it is not negated.

def clause_tex(clause):
    lits = [NAMES[i] if pos else f'\\neg {NAMES[i]}' for i, pos in clause]
    return lits[0] if len(lits) == 1 else '(' + ' \\vee '.join(lits) + ')'


def cnf_tex(clauses):
    return ' \\wedge '.join(clause_tex(c) for c in clauses)


def horn_least_model(clauses, n):
    """Forward chaining from all zeros: the least satisfying set, or None if unsatisfiable."""
    x = [0] * n
    while True:
        broken = next((c for c in clauses if not any(x[i] == pos for i, pos in c)), None)
        if broken is None:
            return x
        head = [i for i, pos in broken if pos]
        if not head:
            return None
        x[head[0]] = 1
