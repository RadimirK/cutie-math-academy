def _partitions(k):
    p = [1] + [0] * k
    for part in range(1, k + 1):
        for s in range(part, k + 1):
            p[s] += p[s - part]
    return p[k]


def generate(rng):
    primes = rng.sample([2, 3, 5, 7], rng.randint(1, 2))
    n, ans = 1, 1
    for p in primes:
        k = rng.randint(1, 4 if p == 2 else 3)
        n *= p ** k
        ans *= _partitions(k)
    return {
        'statement': f'Сколько существует абелевых групп из ${n}$ элементов с точностью до изоморфизма?',
        'answer': ans,
    }
