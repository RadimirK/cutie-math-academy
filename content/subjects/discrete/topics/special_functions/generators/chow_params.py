from cutemath.boolean import NAMES, points, random_vector, vector_str


def generate(rng):
    v = random_vector(rng, 3)
    ones = [p for p, b in zip(points(3), v) if b]
    if rng.random() < 0.4:
        question, answer = '$N(f)$ — число наборов, на которых $f = 1$', len(ones)
    else:
        i = rng.randrange(3)
        question = f'координату при ${NAMES[i]}$ вектора $\\Sigma(f)$ — суммы всех единичных наборов $f$'
        answer = sum(p[i] for p in ones)
    return {
        'statement': (
            f'Функция $f(x, y, z)$ задана вектором значений ${vector_str(v)}$ '
            f'(наборы в порядке $000, 001, \\ldots, 111$). Найдите {question}.'
        ),
        'answer': answer,
    }
