from math import comb


def generate(rng):
    n, m = rng.randint(2, 6), rng.randint(2, 5)
    k = rng.randint(2, 4)
    kinds = [
        (f'\\dim(V \\otimes W)', f'\\dim V = {n}$, $\\dim W = {m}', n * m),
        (f'\\dim V^{{\\otimes {k}}}', f'\\dim V = {n}', n ** k),
        (f'\\dim \\Lambda^{k} V', f'\\dim V = {n}', comb(n, k)),
        (f'\\dim \\Lambda V', f'\\dim V = {n}', 2 ** n),
        (f'\\dim \\operatorname{{Hom}}(V, W)', f'\\dim V = {n}$, $\\dim W = {m}', n * m),
        (f'\\dim (V \\otimes W)^*', f'\\dim V = {n}$, $\\dim W = {m}', n * m),
    ]
    what, given, ans = rng.choice(kinds)
    return {'statement': f'Пусть ${given}$. Найдите ${what}$.', 'answer': ans}
