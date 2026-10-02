from sympy import Matrix


def generate(rng):
    t, s = rng.choice([-3, -2, -1, 1, 2, 3]), rng.choice([-2, -1, 1, 2])
    b = Matrix([[1, t], [0, 1]]) * Matrix([[1, 0], [s, 1]])
    if rng.random() < 0.5:
        b = b[:, [1, 0]]
    v1 = f'({b[0, 0]}, {b[1, 0]})'
    v2 = f'({b[0, 1]}, {b[1, 1]})'
    return {
        'statement': (
            f'В $\\mathbb{{R}}^2$ дан базис $v_1 = {v1}$, $v_2 = {v2}$. Найдите двойственный базис $v_1^*, v_2^*$. '
            'Ответ — матрица, в $i$-й строке которой коэффициенты $v_i^*$ при $e_1^*, e_2^*$ '
            '(то есть $v_i^*(x, y) = a x + b y$ записывается строкой $(a, b)$).'
        ),
        'answer': b.inv().tolist(),
    }
