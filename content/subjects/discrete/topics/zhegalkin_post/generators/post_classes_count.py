from cutemath.boolean import POST_CLASSES, random_formula, to_tex, truth_vector

OPS = ['and', 'or', 'imp', 'xor', 'eq']


def generate(rng):
    n = rng.choice([2, 3])
    f = random_formula(rng, n, OPS, rng.randint(n - 1, 3), negation_rate=0.2)
    v = truth_vector(f, n)
    args = 'x, y' if n == 2 else 'x, y, z'
    return {
        'statement': (
            f'Скольким из пяти классов Поста $T_0, T_1, M, S, L$ принадлежит функция $$f({args}) = {to_tex(f)}?$$'
        ),
        'answer': sum(pred(v, n) for _, pred in POST_CLASSES),
    }
