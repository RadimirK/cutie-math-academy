def generate(rng):
    p = rng.choice([7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43])
    a = rng.randint(2, p - 2)
    order = next(d for d in range(1, p) if pow(a, d, p) == 1)
    return {
        'statement': f'Найдите порядок элемента ${a}$ в группе $(\\mathbb{{Z}}/{p}\\mathbb{{Z}})^\\times$.',
        'answer': order,
    }
