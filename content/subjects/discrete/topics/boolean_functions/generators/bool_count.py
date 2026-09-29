from math import comb


def generate(rng):
    kind = rng.randrange(5)
    n = rng.randint(1, 4)
    if kind == 0:
        what, answer = 'булевых функций', 2 ** 2 ** n
    elif kind == 1:
        what, answer = 'булевых функций, сохраняющих ноль ($f(0, \\ldots, 0) = 0$),', 2 ** (2 ** n - 1)
    elif kind == 2:
        what, answer = 'булевых функций, сохраняющих и ноль, и единицу,', 2 ** (2 ** n - 2)
    elif kind == 3:
        n = rng.randint(2, 4)
        k = rng.randint(1, 3)
        what, answer = f'булевых функций, равных $1$ ровно на ${k}$ наборах,', comb(2 ** n, k)
    else:
        n = rng.randint(2, 4)
        what, answer = 'булевых функций $f$, таких что $f(0, \\ldots, 0) \\ne f(1, \\ldots, 1)$,', 2 ** (2 ** n - 1)
    return {'statement': f'Сколько существует {what} от ${n}$ аргументов?', 'answer': answer}
