from cutemath.boolean import grid, random_formula, to_tex, truth_vector

OPS = ['and', 'or', 'imp', 'xor', 'eq', 'nand', 'nor']


def generate(rng):
    f = random_formula(rng, 2, OPS, rng.randint(1, 2), negation_rate=0.25)
    return {
        'statement': (
            f'Выпишите вектор значений функции $$f(x, y) = {to_tex(f)}$$'
            'на наборах $xy = 00, 01, 10, 11$ (по порядку, слева направо).'
        ),
        'answer': grid(truth_vector(f, 2), 2),
    }
