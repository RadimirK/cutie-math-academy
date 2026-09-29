def generate(rng):
    n = rng.randint(2, 4)
    kind = rng.randrange(5)
    if kind == 0:
        what, answer = 'линейных булевых функций', 2 ** (n + 1)
    elif kind == 1:
        # A self-dual function is fixed by its values on the half of the sets with x_1 = 0.
        what, answer = 'самодвойственных булевых функций', 2 ** 2 ** (n - 1)
    elif kind == 2:
        what, answer = 'линейных булевых функций, сохраняющих ноль,', 2 ** n
    elif kind == 3:
        what, answer = 'булевых функций, сохраняющих и ноль, и единицу,', 2 ** (2 ** n - 2)
    else:
        # a_0 + (sum of k variables) is self-dual iff k is odd.
        what, answer = 'линейных самодвойственных булевых функций', 2 ** n
    return {'statement': f'Сколько существует {what} от ${n}$ аргументов?', 'answer': answer}
