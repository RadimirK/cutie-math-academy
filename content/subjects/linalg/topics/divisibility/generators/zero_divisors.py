def generate(rng):
    n = rng.choice([6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26, 27, 28, 30, 32, 33, 35, 36])
    count = sum(1 for r in range(1, n) if any(r * s % n == 0 for s in range(1, n)))
    return {
        'statement': f'Сколько делителей нуля в кольце $\\mathbb{{Z}}/{n}\\mathbb{{Z}}$?',
        'answer': count,
    }
