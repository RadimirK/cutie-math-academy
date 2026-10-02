def generate(rng):
    n = rng.randint(2, 15)
    if rng.random() < 0.5:
        m = n * rng.randint(2, 6)
    else:
        while True:
            m = rng.randint(4, 60)
            if m % n and m != n:
                break
    return {
        'statement': (
            f'Существует ли гомоморфизм колец с единицей $\\mathbb{{Z}}/{m}\\mathbb{{Z}} \\to \\mathbb{{Z}}/{n}\\mathbb{{Z}}$ '
            '(то есть переводящий $[1]$ в $[1]$)?'
        ),
        'answer': 'Да' if m % n == 0 else 'Нет',
        'config': {'options': ['Да', 'Нет']},
    }
