from cutemath.boolean import random_formula, random_vector, to_tex, truth_vector, vector_str, zhegalkin, zhegalkin_sympy

OPS = ['and', 'or', 'imp', 'xor', 'eq']


def generate(rng):
    if rng.random() < 0.5:
        f = random_formula(rng, 3, OPS, rng.randint(2, 3), negation_rate=0.2)
        v = truth_vector(f, 3)
        given = f'Дана функция $$f(x, y, z) = {to_tex(f)}.$$\n'
    else:
        v = random_vector(rng, 3)
        given = f'Функция $f(x, y, z)$ задана вектором значений ${vector_str(v)}$ (наборы в порядке $000, 001, \\ldots, 111$).\n'
    return {
        'statement': given + 'Найдите её приведённый полином Жегалкина. Вместо $\\oplus$ пишите $+$, конъюнкцию — как произведение: например, $xyz + xz + 1$.',
        'answer': zhegalkin_sympy(zhegalkin(v, 3)),
        'config': {'variables': ['x', 'y', 'z']},
    }
