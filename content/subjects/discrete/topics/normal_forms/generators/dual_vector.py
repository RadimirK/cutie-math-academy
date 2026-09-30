from cutemath.boolean import dual, grid, random_formula, random_vector, to_tex, truth_vector, vector_str

OPS = ['and', 'or', 'imp', 'xor', 'eq']


def generate(rng):
    n = rng.choice([2, 3])
    if rng.random() < 0.5:
        f = random_formula(rng, n, OPS, n - 1 + rng.randint(0, 1), negation_rate=0.2)
        v = truth_vector(f, n)
        args = 'x, y' if n == 2 else 'x, y, z'
        given = f'Дана функция $f({args}) = {to_tex(f)}$.'
    else:
        v = random_vector(rng, n)
        order = '00, 01, 10, 11' if n == 2 else '000, 001, \\ldots, 111'
        given = f'Функция $f$ задана вектором значений ${vector_str(v)}$ (наборы в порядке ${order}$).'
    layout = (
        'Введите вектор значений $f^*$ на наборах $00, 01, 10, 11$.' if n == 2 else
        'Введите значения $f^*$ таблицей: первая строка — $x = 0$, вторая — $x = 1$; столбцы — наборы $yz = 00, 01, 10, 11$.'
    )
    return {
        'statement': f'{given} Найдите двойственную функцию $f^*(x) = \\neg f(\\neg x)$. {layout}',
        'answer': grid(dual(v), n),
    }
