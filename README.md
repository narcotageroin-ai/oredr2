# MoySklad Order Bot — Cloudflare Pages

Простой проект для формирования заказов поставщику через API МойСклад,
задеплоенный на Cloudflare Pages + Functions.

## Структура

- `index.html` — фронтенд (форма в браузере)
- `functions/suppliers.js` — функция, которая отдает список поставщиков из МойСклад
- `functions/create-order.js` — функция, которая анализирует продажи и создает заказ поставщику

## Переменные окружения (настраиваются в Cloudflare Pages → Settings → Environment variables)

- `MSK_TOKEN` — API токен МойСклад
- `ORG_HREF` — ссылка на организацию, вида:
  `https://online.moysklad.ru/api/remap/1.2/entity/organization/ID`

## Деплой

1. Загрузить этот проект в GitHub (репозиторий).
2. В Cloudflare → Pages → Create project → Connect to Git → выбрать репозиторий.
3. Framework preset: **None**
4. Build command: оставить пустым
5. Output directory: оставить пустым (используется корень)
6. После первого деплоя в Settings → Environment variables задать:
   - `MSK_TOKEN`
   - `ORG_HREF`
7. Нажать Redeploy.

После этого проект будет доступен по адресу:
`https://<имя-проекта>.pages.dev`
