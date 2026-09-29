"""JSON-over-stdio entry point for scripts/selftest.ts.

Request:  {"generate": [{"key", "source", "seed"}...], "check": [{"key", "type", "correct", "config"}...]}
Response: {"generated": {key: instance | {"error"}}, "checked": {key: {"accepts", "rejects", "wrong"} | {"error"}}}

For every check item, the reference answer must be accepted by its own checker and a
mutated answer (cutemath.checks.wrong) must be rejected.
"""
import json
import signal
import sys
import traceback

from .checks import check, wrong
from .generate import run_generator

TIMEOUT_S = 10


class _Timeout(Exception):
    pass


def _alarm(signum, frame):
    raise _Timeout()


def _with_timeout(fn):
    signal.signal(signal.SIGALRM, _alarm)
    signal.alarm(TIMEOUT_S)
    try:
        return fn()
    except _Timeout:
        return {'error': f'дольше {TIMEOUT_S} с'}
    except Exception as e:  # noqa: BLE001
        return {'error': f'{type(e).__name__}: {e}', 'trace': traceback.format_exc(limit=3)}
    finally:
        signal.alarm(0)


def _self_check(item):
    t, correct, cfg = item['type'], item['correct'], item.get('config') or {}
    accepts = check(t, correct, correct, cfg)
    bad = wrong(t, correct, cfg)
    rejects = check(t, bad, correct, cfg)
    return {'accepts': accepts, 'rejects': rejects, 'wrong': bad}


def main():
    req = json.load(sys.stdin)
    out = {'generated': {}, 'checked': {}}
    for g in req.get('generate', []):
        out['generated'][g['key']] = _with_timeout(lambda: run_generator(g['source'], g['seed'], g['key']))
    for c in req.get('check', []):
        out['checked'][c['key']] = _with_timeout(lambda: _self_check(c))
    json.dump(out, sys.stdout, ensure_ascii=False)


if __name__ == '__main__':
    main()
