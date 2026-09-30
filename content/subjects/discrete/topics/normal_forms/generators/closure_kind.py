from cutemath.boolean import closed_under, maj, random_vector, table_tex

KINDS = [
    ('КНФ Хорна (множество единиц замкнуто относительно покомпонентного $\\wedge$)', lambda a, b: a & b),
    ('2-КНФ (множество единиц замкнуто относительно покомпонентной медианы)', maj),
]


def generate(rng):
    what, op = rng.choice(KINDS)
    want = rng.random() < 0.5
    for _ in range(2000):
        v = random_vector(rng, 3)
        if closed_under(v, 3, op) == want:
            break
    return {
        'statement': f'Функция задана таблицей {table_tex(v, 3)} Можно ли записать её в виде {what}?',
        'answer': 'Да' if closed_under(v, 3, op) else 'Нет',
        'config': {'options': ['Да', 'Нет']},
    }
