MONOTONE = {2: 6, 3: 20}
MONOTONE_SELF_DUAL = {2: 2, 3: 4, 4: 12}


def generate(rng):
    if rng.random() < 0.5:
        n = rng.choice(list(MONOTONE))
        return {'statement': f'Сколько существует монотонных булевых функций от ${n}$ переменных?', 'answer': MONOTONE[n]}
    n = rng.choice(list(MONOTONE_SELF_DUAL))
    return {
        'statement': f'Сколько существует монотонных самодвойственных булевых функций от ${n}$ переменных?',
        'answer': MONOTONE_SELF_DUAL[n],
    }
