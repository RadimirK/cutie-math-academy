def generate(rng):
    while True:
        sizes = sorted((rng.randint(1, 4) for _ in range(rng.randint(2, 4))), reverse=True)
        n = sum(sizes)
        if n <= 9:
            break
    lam = rng.randint(-3, 5)
    top = max(sizes)
    dims = [sum(min(k, m) for m in sizes) for k in range(1, top + 2)]
    shown = ', '.join(f'{d}' for d in dims)
    seq = f'k = 1, 2, \\ldots, {len(dims)}'
    kind = rng.randrange(3)
    if kind == 0:
        ask, ans = 'Сколько всего жордановых клеток?', len(sizes)
    elif kind == 1:
        ask, ans = 'Каков размер самой большой клетки?', top
    else:
        s = rng.choice(sizes)
        ask, ans = f'Сколько клеток размера ровно ${s}$?', sizes.count(s)
    return {
        'statement': (
            f'У оператора $A$ на ${n}$-мерном пространстве единственное собственное значение $\\lambda = {lam}$, а '
            f'$\\dim\\ker(A - \\lambda E)^k$ при ${seq}$ равны ${shown}$. {ask}'
        ),
        'answer': ans,
    }
