from cutemath.boolean import points, random_formula, random_vector, to_tex, truth_vector, vector_str

OPS = ['and', 'or', 'imp', 'xor', 'eq']


def generate(rng):
    if rng.random() < 0.5:
        f = random_formula(rng, 3, OPS, rng.randint(2, 3), negation_rate=0.2)
        v = truth_vector(f, 3)
        return {
            'statement': f'Сколько элементарных конъюнкций в СДНФ функции $$f(x, y, z) = {to_tex(f)}?$$',
            'answer': sum(v),
        }
    v = random_vector(rng, 3)
    # A term negates the variables that are 0 on its row.
    negations = sum(3 - sum(p) for p, value in zip(points(3), v) if value)
    return {
        'statement': (
            f'Функция $f(x, y, z)$ задана вектором значений ${vector_str(v)}$ '
            '(наборы в порядке $000, 001, \\ldots, 111$). '
            'Сколько всего отрицаний в её СДНФ?'
        ),
        'answer': negations,
    }
