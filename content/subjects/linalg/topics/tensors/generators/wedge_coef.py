from sympy import Matrix


def _vec(v):
    terms = []
    for i, c in enumerate(v, start=1):
        if c == 0:
            continue
        sign = '-' if c < 0 else '+'
        mag = '' if abs(c) == 1 else str(abs(c))
        terms.append((sign, f'{mag}e_{i}'))
    if not terms:
        return '0'
    out = ('-' if terms[0][0] == '-' else '') + terms[0][1]
    for sign, t in terms[1:]:
        out += f' {sign} {t}'
    return out


def generate(rng):
    n = 3 if rng.random() < 0.6 else 4
    u = [rng.randint(-3, 3) for _ in range(n)]
    v = [rng.randint(-3, 3) for _ in range(n)]
    if rng.random() < 0.5 or n == 4:
        i, j = sorted(rng.sample(range(n), 2))
        return {
            'statement': (
                f'В $\\Lambda^2 \\mathbb{{R}}^{n}$ найдите коэффициент при $e_{i + 1} \\wedge e_{j + 1}$ '
                f'в разложении $({_vec(u)}) \\wedge ({_vec(v)})$ по базису $e_k \\wedge e_l$, $k < l$.'
            ),
            'answer': u[i] * v[j] - u[j] * v[i],
        }
    w = [rng.randint(-2, 2) for _ in range(3)]
    return {
        'statement': (
            'Найдите коэффициент при $e_1 \\wedge e_2 \\wedge e_3$ в произведении '
            f'$({_vec(u)}) \\wedge ({_vec(v)}) \\wedge ({_vec(w)})$.'
        ),
        'answer': Matrix([u, v, w]).det(),
    }
