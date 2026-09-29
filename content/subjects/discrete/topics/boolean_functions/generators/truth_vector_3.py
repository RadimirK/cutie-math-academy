from cutemath.boolean import grid, random_formula, to_tex, truth_vector

OPS = ['and', 'or', 'imp', 'xor', 'eq']


def generate(rng):
    f = random_formula(rng, 3, OPS, rng.randint(2, 3), negation_rate=0.2)
    layout = (
        '$$\\begin{array}{c|cccc} x \\backslash yz & 00 & 01 & 10 & 11 \\\\ \\hline '
        '0 & f(000) & f(001) & f(010) & f(011) \\\\ 1 & f(100) & f(101) & f(110) & f(111) \\end{array}$$'
    )
    return {
        'statement': (
            f'Постройте таблицу значений функции $$f(x, y, z) = {to_tex(f)}.$$'
            f'Первая строка — $x = 0$, вторая — $x = 1$; столбцы — наборы $yz$:\n{layout}'
        ),
        'answer': grid(truth_vector(f, 3), 3),
    }
