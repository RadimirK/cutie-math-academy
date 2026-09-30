from cutemath.boolean import is_forcible, random_vector, table_tex


def generate(rng):
    n = rng.choice([2, 3, 3])
    want = rng.random() < 0.5
    for _ in range(1000):
        v = random_vector(rng, n)
        if is_forcible(v, n) == want:
            break
    return {
        'statement': (
            f'Функция задана таблицей {table_tex(v, n)} Форсируема ли она, то есть можно ли зафиксировать '
            'одну переменную так, чтобы функция стала константой?'
        ),
        'answer': 'Да' if is_forcible(v, n) else 'Нет',
        'config': {'options': ['Да', 'Нет']},
    }
