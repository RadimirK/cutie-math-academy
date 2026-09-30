from cutemath.boolean import cnf_tex, horn_least_model


def random_horn(rng, n, m):
    clauses = [((rng.randrange(n), True),)]
    for _ in range(m - 1):
        body = sorted(rng.sample(range(n), rng.randint(1, 2)))
        heads = [i for i in range(n) if i not in body]
        if rng.random() < 0.8 and heads:
            clauses.append(tuple((i, False) for i in body) + ((rng.choice(heads), True),))
        else:
            clauses.append(tuple((i, False) for i in body))
    return list(dict.fromkeys(clauses))  # drop repeated clauses, keep order


def generate(rng):
    n = 4
    while True:
        clauses = random_horn(rng, n, rng.randint(4, 6))
        model = horn_least_model(clauses, n)
        if model is not None and sum(model) >= 2:
            break
    return {
        'statement': (
            f'КНФ Хорна $$ {cnf_tex(clauses)} $$ выполнима. Сколько единиц в её выполняющем наборе '
            'с наименьшим числом единиц?'
        ),
        'answer': sum(model),
    }
