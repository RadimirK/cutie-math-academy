from cutemath.boolean import is_monotone, minimal_ones, random_vector, vector_str


def generate(rng):
    n = rng.choice([3, 4])
    while True:
        v = random_vector(rng, n)
        if is_monotone(v, n):
            break
    order = '000, 001, \\ldots, 111' if n == 3 else '0000, 0001, \\ldots, 1111'
    args = 'x, y, z' if n == 3 else 'x, y, z, t'
    return {
        'statement': (
            f'Монотонная функция $f({args})$ задана вектором значений ${vector_str(v)}$ (наборы в порядке ${order}$). '
            'Сколько конъюнкций в её записи дизъюнкцией конъюнкций нижних единиц, то есть сколько у неё нижних единиц?'
        ),
        'answer': len(minimal_ones(v, n)),
    }
