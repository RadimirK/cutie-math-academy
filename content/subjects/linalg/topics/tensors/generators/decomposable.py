from sympy import Matrix


def generate(rng):
    rows, cols = 2, rng.randint(2, 3)
    if rng.random() < 0.5:
        while True:
            v = Matrix(rows, 1, lambda i, j: rng.randint(-2, 2))
            w = Matrix(1, cols, lambda i, j: rng.randint(-2, 2))
            a = v * w
            if a.rank() == 1:
                break
    else:
        while True:
            a = Matrix(rows, cols, lambda i, j: rng.randint(-2, 2))
            if a.rank() == 2 and sum(1 for t in a if t != 0) >= 3:
                break
    terms = []
    for i in range(rows):
        for j in range(cols):
            c = a[i, j]
            if c == 0:
                continue
            mag = '' if abs(c) == 1 else str(abs(c))
            terms.append(('-' if c < 0 else '+', f'{mag}\\, e_{i + 1} \\otimes f_{j + 1}' if mag else f'e_{i + 1} \\otimes f_{j + 1}'))
    text = ('-' if terms[0][0] == '-' else '') + terms[0][1] + ''.join(f' {s} {t}' for s, t in terms[1:])
    return {
        'statement': (
            f'Можно ли записать тензор ${text} \\in \\mathbb{{R}}^2 \\otimes \\mathbb{{R}}^{cols}$ '
            'в виде $v \\otimes w$?'
        ),
        'answer': 'Да' if a.rank() == 1 else 'Нет',
        'config': {'options': ['Да', 'Нет']},
    }
