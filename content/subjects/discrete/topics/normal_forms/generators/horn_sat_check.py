from cutemath.boolean import cnf_tex, horn_least_model


def random_horn(rng, n, m):
    clauses = [((rng.randrange(n), True),)]  # at least one fact, or all-zeros trivially works
    for _ in range(m - 1):
        body = sorted(rng.sample(range(n), rng.randint(1, 2)))
        heads = [i for i in range(n) if i not in body]
        if rng.random() < 0.75 and heads:
            clauses.append(tuple((i, False) for i in body) + ((rng.choice(heads), True),))
        else:
            clauses.append(tuple((i, False) for i in body))
    return list(dict.fromkeys(clauses))  # drop repeated clauses, keep order


def generate(rng):
    n = 4
    want = rng.random() < 0.5
    for _ in range(1000):
        clauses = random_horn(rng, n, rng.randint(4, 6))
        if (horn_least_model(clauses, n) is not None) == want:
            break
    ok = horn_least_model(clauses, n) is not None
    return {
        'statement': f'Выполнима ли КНФ Хорна $$ {cnf_tex(clauses)} ?$$',
        'answer': 'Выполнима' if ok else 'Невыполнима',
        'config': {'options': ['Выполнима', 'Невыполнима']},
    }
