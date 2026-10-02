# Cutie Math Academy

Аниме-гача для друзей-студентов: валюта для круток зарабатывается решением задач по
предметам первого курса, теорию объясняют героини в сценах визуальной новеллы.
Проектный документ и инварианты: [docs/design.md](docs/design.md).

## Структура

```
content/             контент в YAML: предметы, темы, сцены, шаблоны задач, персонажи, баннеры
src/content/         zod-схемы и загрузчик контента (общие для приложения и CI)
src/core/            ядро: генерация задач по seed, VN-движок, правила прогресса
src/answer-types/    плагины типов ответов
src/figures/         плагины рисунков (доска в сценах, картинки в задачах)
src/screens, src/ui  экраны и компоненты
python/cutemath/     проверяющие ответов и запуск генераторов (CPython в CI, Pyodide в браузере)
scripts/             validate-content, selftest, sync-content
supabase/            миграции (схема, RLS, RPC), тесты БД, локальный конфиг
.github/workflows/   ci, deploy (ci → миграции и sync → сборка → Pages), keepalive
```

## Разработка

```bash
npm install
uv venv .venv && uv pip install --python .venv -r python/requirements.txt
npm run dev          # http://localhost:5173
```

Без `.env.local` приложение работает в **демо-режиме**: сцены и карта работают, прогресс
живёт только в памяти, крутки недоступны.

С локальным Supabase (нужен Docker):

```bash
npx supabase start                                        # поднимает Postgres, Auth, API
npx supabase status -o env                                # API_URL, ANON_KEY, SERVICE_ROLE_KEY
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<service key> npm run content:sync
```

Затем в `.env.local`: `VITE_SUPABASE_URL=http://127.0.0.1:54321` и `VITE_SUPABASE_ANON_KEY=<anon key>`.
Инвайт-коды для локальной регистрации: `LOCAL-DEV-1..3` (из `supabase/seed.sql`).
`npx supabase db reset` пересоздаёт базу из миграций и seed (после него снова `content:sync`).

## Проверки (то же, что в CI)

```bash
npm run ci                 # typecheck, валидация контента, unit-тесты, самотест шаблонов
PYTHONPATH=python .venv/bin/python -m unittest discover -s python/tests
supabase/tests/run.sh      # миграции + сценарий RLS/RPC на чистом Postgres в Docker
```

## Как добавить контент

- **Задачу:** YAML-файл в `content/subjects/<предмет>/topics/<тема>/problems/`, id = имя файла,
  плюс id в `unlocks` какой-нибудь сцены. Сложные случаи — `generator: generators/<name>.py`
  с функцией `generate(rng)`, возвращающей `{statement, answer}`.
- **Тему:** папку в `topics/` с `topic.yaml`, сценами и задачами.
- **Предмет:** папку в `content/subjects/` с `subject.yaml`.
- **Персонажа:** `content/characters/<id>.yaml` (имя, редкость, предмет, внешность `look`,
  см. [docs/character-art.md](docs/character-art.md)) и рядом `<id>.md` с характером. Этот
  файл написан как промпт для LLM: кто она, как говорит и объясняет, какие эмоции когда
  использует, с кем дружит, примеры реплик. По нему пишут сцены, и по нему же модель может
  говорить от её лица. Загрузчик контента `.md` не читает.

Параметры шаблона подставляются как `<<a>>`, фильтры: `<<b|signed>>` → `+ 3` / `- 3`,
`<<c|paren>>` → `(-5)`. Коррелированные значения: `type: pick` со словарями и `<<name.field>>`.
Формулы в текстах — `$...$` и `$$...$$`. Ответы пишутся в синтаксисе sympy: `exp(2*x)`, `3/4`,
`oo`, `DNE` (не существует), матрица `[[1, 2], [3, 4]]`.

**Выбор из многих вариантов.** У `answer_type: choice` вместо `options` можно задать пул неверных
ответов `distractors` и их число `count` (по умолчанию 8 вариантов вместе с верным): задача покажет
верный ответ и случайные `count - 1` вариантов из пула, перемешанные по seed. `shuffle: true`
перемешивает обычные `options`. Генератор возвращает тот же `config`; текстовые ответы вроде
`'$A \cup B$'` или `'Да'` он отдаёт как есть.

**Рисунки.** Поле `figure` в задаче (или в ответе генератора) рисует картинку под условием,
`figure` у реплики сцены кладёт её на доску до конца узла (`figure: null` стирает доску):

- `{type: venn, sets: [A, B, C], shade: '(A | B) - C', elements: {AB: '3 4'}}` — диаграмма Венна;
  `shade` — выражение (`~` дополнение, `&`, `|`, `-`, `^`) или список областей (`A`, `AB`, `0` — снаружи);
- `{type: relation, nodes: '1 2 3', edges: '1>2 2>2'}` — граф отношения;
- `{type: mapping, sets: [{name: A, elements: '1 2'}, {name: B, elements: 'a b'}], maps: ['1>a 2>a'], labels: [f]}` —
  множества столбцами и стрелки между соседними (`maps[i]` из `sets[i]` в `sets[i + 1]`); `through` и
  `through_label` рисуют пунктиром композицию из первого множества в последнее;
- `{type: cube, values: '00010111', highlight: '011 101'}` — булев куб, единицы закрашены;
- `{type: sequence, expr: '(-1)^n/n', count: 20, limit: 0, eps: 0.1, interactive: true}` — точки
  $x_n$ (или `values: [...]`), предел, полоса $\varepsilon$; `interactive` добавляет ползунок $\varepsilon$
  с отметкой $N$ (только для сцен: в задаче он подсказывает ответ).

Плагины рисунков — `src/figures/` (схемы в `core.ts`, SVG в `Figure.tsx`).

`npm run content:validate` и `npm run content:selftest` покажут ошибки до пулл-реквеста.

## Арт

Персонажи и фоны рисуются программой в пиксельном стиле из описаний в YAML: внешность `look`
у персонажей ([docs/character-art.md](docs/character-art.md)) и фоны из предметов
([docs/backgrounds.md](docs/backgrounds.md)). Готовые картинки (`content/assets/characters/`,
`content/assets/backgrounds/`) в `.gitignore`: это чужой арт, а репозиторий и сайт публичные.
Локально такая картинка заменяет сгенерированную. Как подключать арт — в
`content/assets/CREDITS.md` и в описании `sprites` у персонажей.

## Первичная настройка хостинга

Пока секреты Supabase не заданы, деплой проходит в **демо-режиме**: шаги миграций и
синхронизации пропускаются, сайт собирается без базы.

1. **Supabase:** создать проект. В *Authentication → Sign In / Providers → Email* выключить
   *Confirm email*. В *Authentication → URL Configuration* указать адрес сайта на Pages как
   Site URL и Redirect URL.
2. **GitHub:** публичный репозиторий (или Student Pack), *Settings → Pages → Source: GitHub Actions*.
3. **Секреты репозитория** (*Settings → Secrets and variables → Actions*):
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — из *Project Settings → API*;
   - `SUPABASE_SERVICE_ROLE_KEY` — оттуда же, **никогда не коммитить** (инвариант 8);
   - `SUPABASE_DB_URL` — строка подключения (*Connect → Session pooler*) с паролем БД,
     нужна для `supabase db push` в деплое.
4. Инвайты создаются в SQL-редакторе Supabase:
   `insert into public.invites (code) values ('придумай-код');`
