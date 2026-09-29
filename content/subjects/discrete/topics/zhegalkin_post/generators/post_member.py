from cutemath.boolean import POST_CLASSES, random_vector, table_tex, vector_str

NAMES = {
    'T_0': 'сохраняющих ноль, $T_0$',
    'T_1': 'сохраняющих единицу, $T_1$',
    'M': 'монотонных функций, $M$',
    'S': 'самодвойственных функций, $S$',
    'L': 'линейных функций, $L$',
}


def generate(rng):
    n = rng.choice([2, 3, 3])
    name, pred = rng.choice(POST_CLASSES)
    # Pick functions from the class about half of the time, so the answer is not always «Нет».
    want = rng.random() < 0.5
    for _ in range(1000):
        v = random_vector(rng, n)
        if pred(v, n) == want:
            break
    return {
        'statement': f'Функция задана таблицей {table_tex(v, n)} Принадлежит ли она классу {NAMES[name]}?',
        'answer': 'Да' if pred(v, n) else 'Нет',
        'config': {'options': ['Да', 'Нет']},
    }
