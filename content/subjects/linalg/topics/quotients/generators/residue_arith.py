def generate(rng):
    n = rng.randint(5, 30)
    a, b, c = rng.randint(10, 200), rng.randint(10, 200), rng.randint(-50, 50)
    sign = '+' if c >= 0 else '-'
    return {
        'statement': (
            f'Вычислите $[{a}] \\cdot [{b}] {sign} [{abs(c)}]$ в $\\mathbb{{Z}}/{n}\\mathbb{{Z}}$. '
            f'Ответ — представитель от $0$ до ${n - 1}$.'
        ),
        'answer': (a * b + c) % n,
    }
