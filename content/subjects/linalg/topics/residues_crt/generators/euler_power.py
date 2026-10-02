from math import gcd


def generate(rng):
    n = rng.choice([7, 9, 10, 11, 13, 15, 16, 20, 21, 25, 100])
    while True:
        a = rng.randint(2, 40)
        if gcd(a, n) == 1 and a % n != 1:
            break
    k = rng.randint(1000, 99999)
    what = 'последние две цифры числа' if n == 100 else ('последнюю цифру числа' if n == 10 else 'остаток от деления на $' + str(n) + '$ числа')
    note = ' (ответ — число от $0$ до $99$)' if n == 100 else ''
    return {
        'statement': f'Найдите {what} ${a}^{{{k}}}${note}.',
        'answer': pow(a, k, n),
    }
