def generate(rng):
    n = rng.randint(2, 7)
    kind = rng.randrange(5)
    if kind == 0:
        what, answer = 'симметричных булевых функций', 2 ** (n + 1)
    elif kind == 1:
        what, answer = 'симметричных булевых функций, сохраняющих ноль,', 2 ** n
    elif kind == 2:
        # Non-decreasing in the weight: a step at one of n + 1 places, or constant 0.
        what, answer = 'монотонных симметричных булевых функций', n + 2
    elif kind == 3:
        # v_k = ¬v_{n-k}: impossible for k = n/2, otherwise pairs of weights.
        what, answer = 'самодвойственных симметричных булевых функций', 0 if n % 2 == 0 else 2 ** ((n + 1) // 2)
    else:
        # Weight >= k or weight <= k (including both constants).
        what, answer = 'пороговых симметричных булевых функций', 2 * n + 2
    return {'statement': f'Сколько существует {what} от ${n}$ переменных?', 'answer': answer}
