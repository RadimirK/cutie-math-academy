from cutemath.boolean import points, random_formula, random_vector, to_tex, truth_vector, vector_str

OPS = ['and', 'or', 'imp', 'xor', 'eq']


def generate(rng):
    if rng.random() < 0.5:
        f = random_formula(rng, 3, OPS, rng.randint(2, 3), negation_rate=0.2)
        v = truth_vector(f, 3)
        return {
            'statement': f'Сколько дизъюнкций в СКНФ функции $$f(x, y, z) = {to_tex(f)}?$$',
            'answer': v.count(0),
        }
    v = random_vector(rng, 3)
    # In the clause of a zero row, the variables equal to 1 are negated.
    negations = sum(sum(p) for p, value in zip(points(3), v) if not value)
    return {
        'statement': (
            f'Функция $f(x, y, z)$ задана вектором значений ${vector_str(v)}$ '
            '(наборы в порядке $000, 001, \\ldots, 111$). Сколько всего отрицаний в её СКНФ?'
        ),
        'answer': negations,
    }
