from math import gcd


def generate(rng):
    primes = rng.sample([2, 3, 5, 7, 11, 13], rng.randint(1, 3))
    while True:
        n = 1
        for p in primes:
            n *= p ** rng.randint(1, 3)
        if 10 < n < 30000:
            break
        primes = rng.sample([2, 3, 5, 7, 11, 13], rng.randint(1, 3))
    return {
        'statement': f'Найдите $\\varphi({n})$.',
        'answer': sum(1 for k in range(1, n + 1) if gcd(k, n) == 1),
    }
