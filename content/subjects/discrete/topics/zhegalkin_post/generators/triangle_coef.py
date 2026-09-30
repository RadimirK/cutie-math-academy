from cutemath.boolean import random_vector, vector_str, zhegalkin


def generate(rng):
    v = random_vector(rng, 3)
    monomials = zhegalkin(v, 3)
    if rng.random() < 0.5:
        question, answer = 'Сколько мономов (включая константу $1$) в её приведённом полиноме Жегалкина?', len(monomials)
    else:
        question = 'Какова степень её полинома Жегалкина (наибольшее число переменных в мономе)?'
        answer = max(len(m) for m in monomials)
    return {
        'statement': (
            f'Функция $f(x, y, z)$ задана вектором значений ${vector_str(v)}$ '
            f'(наборы в порядке $000, 001, \\ldots, 111$). {question}'
        ),
        'answer': answer,
    }
