def generate(rng):
    primes = rng.sample([2, 3, 5, 7, 11, 13], rng.randint(2, 3))
    n = 1
    while True:
        exps = [rng.randint(1, 4) for _ in primes]
        n = 1
        for p, e in zip(primes, exps):
            n *= p ** e
        if n < 200000:
            break
    count = sum(1 for d in range(1, n + 1) if n % d == 0)
    return {'statement': f'Сколько натуральных делителей у числа ${n}$?', 'answer': count}
