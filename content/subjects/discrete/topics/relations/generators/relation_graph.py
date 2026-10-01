from itertools import product

PROPS = ('рефлексивно', 'симметрично', 'транзитивно')
N = 3
PAIRS = [(i, j) for i in range(N) for j in range(N)]


def props(rel):
    reflexive = all((i, i) in rel for i in range(N))
    symmetric = all((j, i) in rel for i, j in rel)
    transitive = all((i, l) in rel for i, j in rel for k, l in rel if j == k)
    return reflexive, symmetric, transitive


def describe(mask):
    yes = [p for p, b in zip(PROPS, mask) if b]
    no = [p for p, b in zip(PROPS, mask) if not b]
    if not no:
        return 'рефлексивно, симметрично и транзитивно'
    if not yes:
        return 'ни рефлексивно, ни симметрично, ни транзитивно'
    return ' и '.join(yes) + ', но не ' + ' и не '.join(no)


MASKS = list(product((True, False), repeat=3))
# All 512 relations on a 3-element set, grouped by their properties.
BY_MASK = {m: [] for m in MASKS}
for bits in product((0, 1), repeat=len(PAIRS)):
    rel = {p for p, b in zip(PAIRS, bits) if b}
    BY_MASK[props(rel)].append(rel)


def generate(rng):
    # Every combination of properties is equally likely, or the answer would mostly be "none".
    mask = rng.choice(MASKS)
    rel = sorted(rng.choice(BY_MASK[mask]))
    return {
        'statement': 'Отношение на $\\{1, 2, 3\\}$ задано графом: стрелка $x \\to y$ означает $x \\mathrel{R} y$. Какими свойствами оно обладает?',
        'answer': describe(mask),
        'config': {'options': [describe(m) for m in MASKS]},
        'figure': {'type': 'relation', 'nodes': [1, 2, 3], 'edges': [[i + 1, j + 1] for i, j in rel]},
    }
