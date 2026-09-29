"""Single JSON entry point used by the browser worker (src/worker/python.worker.ts)."""
import json

from .checks import check
from .generate import run_generator


def handle(request_json):
    req = json.loads(request_json)
    op = req['op']
    if op == 'generate':
        result = run_generator(req['source'], req['seed'], req.get('name', '<generator>'))
    elif op == 'check':
        result = check(req['type'], req['user'], req['correct'], req.get('config') or {}, req.get('stage', 'full'))
    elif op == 'ping':
        result = 'pong'
    else:
        raise ValueError(f'unknown op {op}')
    return json.dumps(result, ensure_ascii=False)
