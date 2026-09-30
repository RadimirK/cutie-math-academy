def generate(rng):
    n = rng.randint(2, 3)
    total = 2 ** 2 ** n
    kind = rng.randrange(4)
    if kind == 0:
        what, answer = 'лежащих в $T_0$ или в $T_1$ (хотя бы в одном из них)', 2 * 2 ** (2 ** n - 1) - 2 ** (2 ** n - 2)
    elif kind == 1:
        what, answer = 'существенно зависящих от $x_1$', total - 2 ** 2 ** (n - 1)
    elif kind == 2:
        what, answer = 'лежащих в $T_0$ или в $S$ (хотя бы в одном из них)', (
            2 ** (2 ** n - 1) + 2 ** 2 ** (n - 1) - 2 ** (2 ** (n - 1) - 1))
    else:
        what, answer = 'не являющихся линейными', total - 2 ** (n + 1)
    return {'statement': f'Сколько существует булевых функций от ${n}$ переменных $x_1, \\ldots, x_{n}$, {what}?', 'answer': answer}
