def generate(rng):
    n = rng.randint(2, 6)
    kinds = [
        (f'многочленов степени не выше ${n}$ над $\\mathbb{{R}}$ (вместе с нулём)', n + 1),
        (f'матриц ${n} \\times {n + 1}$ над $\\mathbb{{R}}$', n * (n + 1)),
        (f'симметричных матриц ${n} \\times {n}$ над $\\mathbb{{R}}$', n * (n + 1) // 2),
        (f'кососимметричных матриц ${n} \\times {n}$ ($A^T = -A$) над $\\mathbb{{R}}$', n * (n - 1) // 2),
        (f'матриц ${n} \\times {n}$ со следом $0$ над $\\mathbb{{R}}$', n * n - 1),
        (f'верхнетреугольных матриц ${n} \\times {n}$ над $\\mathbb{{R}}$', n * (n + 1) // 2),
        (f'$\\mathbb{{C}}^{n}$ как пространства над $\\mathbb{{R}}$', 2 * n),
        (f'многочленов $p$ степени не выше ${n}$ над $\\mathbb{{R}}$ с $p(1) = 0$', n),
    ]
    text, ans = rng.choice(kinds)
    return {'statement': f'Найдите размерность пространства {text}.', 'answer': ans}
