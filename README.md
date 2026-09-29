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

Параметры шаблона подставляются как `<<a>>`, фильтры: `<<b|signed>>` → `+ 3` / `- 3`,
`<<c|paren>>` → `(-5)`. Коррелированные значения: `type: pick` со словарями и `<<name.field>>`.
Формулы в текстах — `$...$` и `$$...$$`. Ответы пишутся в синтаксисе sympy: `exp(2*x)`, `3/4`,
`oo`, `DNE` (не существует), матрица `[[1, 2], [3, 4]]`.

`npm run content:validate` и `npm run content:selftest` покажут ошибки до пулл-реквеста.

## Арт

Картинки персонажей и фонов (`content/assets/characters/`, `content/assets/backgrounds/`)
в `.gitignore`: это чужой арт, а репозиторий и сайт публичные. Локально он работает,
на опубликованном сайте вместо него силуэты. Как подключать арт — в `content/assets/CREDITS.md`
и в описании `sprites` у персонажей.

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
