from cutemath.boolean import random_formula, random_vector, to_tex, truth_vector, vector_str, zhegalkin, zhegalkin_sympy

OPS = ['and', 'or', 'imp', 'eq', 'nand', 'nor']


def generate(rng):
    if rng.random() < 0.5:
        f = random_formula(rng, 2, OPS, rng.randint(1, 2), negation_rate=0.25)
        v = truth_vector(f, 2)
        given = f'Дана функция $$f(x, y) = {to_tex(f)}.$$\n'
    else:
        v = random_vector(rng, 2)
        given = f'Функция $f(x, y)$ задана вектором значений ${vector_str(v)}$ (наборы $xy = 00, 01, 10, 11$).\n'
    return {
        'statement': given + 'Найдите её приведённый полином Жегалкина. Вместо $\\oplus$ пишите $+$, конъюнкцию — как произведение: например, $xy + x + 1$.',
        'answer': zhegalkin_sympy(zhegalkin(v, 2)),
        'config': {'variables': ['x', 'y']},
    }
