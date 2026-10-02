def generate(rng):
    p = rng.choice([7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43])
    a = rng.randrange(p) if rng.random() < 0.15 else rng.randint(1, p - 1)
    return {
        'statement': f'Сколько решений у уравнения $x^2 = {a}$ в поле $\\mathbb{{Z}}/{p}\\mathbb{{Z}}$?',
        'answer': sum(1 for t in range(p) if (t * t - a) % p == 0),
    }
