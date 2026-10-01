"""Runs template generators: generate(rng) -> {statement, answer, config?, figure?}."""
import random

from .parse import format_answer


def run_generator(source, seed, name='<generator>'):
    namespace = {'__name__': f'cutemath_generator_{abs(hash(name))}'}
    exec(compile(source, name, 'exec'), namespace)  # noqa: S102 - generators come from the reviewed repo only
    generate = namespace.get('generate')
    if not callable(generate):
        raise ValueError(f'{name}: нет функции generate(rng)')
    result = generate(random.Random(seed))
    if not isinstance(result, dict) or 'statement' not in result or 'answer' not in result:
        raise ValueError(f'{name}: generate() должна вернуть dict со statement и answer')
    out = {
        'statement': str(result['statement']),
        'answer': format_answer(result['answer']),
        'config': result.get('config', {}),
        'params': {k: format_answer(v) for k, v in result.get('params', {}).items()},
    }
    if result.get('figure') is not None:
        out['figure'] = result['figure']
    return out
