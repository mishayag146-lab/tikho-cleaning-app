"use client";
import { useState, useEffect, type FormEvent } from "react";
import {
  ArrowUpRight,
  RefreshCw,
  Search,
  Check,
  Inbox,
  Settings2,
  List,
  Leaf,
  ShieldCheck,
} from "lucide-react";
import { api, jsonOptions } from "@/lib/client";
import { catalog, money, statuses, type Config, type Item } from "@/lib/domain";
const tabs = ["Заявки", "Тарифы", "Компания", "Игра", "Персонажи", "Доступ"];
export default function Admin({ config }: { config: Config }) {
  const [cfg, setCfg] = useState(config);
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState("Заявки");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  async function load() {
    try {
      setLoading(true);
      const result = await api("admin");
      setOrders(result.orders);
      setCfg(result.config);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function saveConfig(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");
    try {
      setCfg(await api("admin/config", jsonOptions("PUT", cfg)));
      setNotice("Настройки сохранены");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveOrder(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        "admin/order",
        jsonOptions("PUT", {
          id: selected.id,
          version: selected.version,
          status: selected.status,
          finalPrice: selected.finalPrice,
          scheduled: selected.scheduled,
          note: selected.note,
        }),
      );
      setSelected(null);
      await load();
      setNotice("Заявка обновлена");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const shown = orders.filter(
    (o) =>
      (filter === "all" || o.status === filter) &&
      [o.name, o.phone, o.address, o.id]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const numberField = (key: keyof Config, label: string, max = 1000000) => (
    <label key={key}>
      {label}
      <input
        required
        type="number"
        min="0"
        max={max}
        value={String(cfg[key])}
        onChange={(e) => setCfg({ ...cfg, [key]: Number(e.target.value) })}
      />
    </label>
  );
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <a href="/" className="brand">
          {cfg.name.toLowerCase()}.
        </a>
        <p className="eyebrow">Кабинет мастера</p>
        <nav>
          {tabs.map((t, i) => (
            <button
              className={tab === t ? "active" : ""}
              key={t}
              onClick={() => {
                setTab(t);
                setSelected(null);
                setNotice("");
              }}
            >
              {i === 0 ? (
                <List size={18} />
              ) : i === 5 ? (
                <ShieldCheck size={18} />
              ) : (
                <Settings2 size={18} />
              )}{" "}
              {t}
              {t === "Заявки" && (
                <span>{orders.filter((o) => o.status === "new").length}</span>
              )}
            </button>
          ))}
        </nav>
        <a className="site-link" href="/" target="_blank">
          Открыть сайт <ArrowUpRight size={16} />
        </a>
      </aside>
      <main className="admin-main">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{cfg.city}</span>
            <h1>{tab}</h1>
          </div>
          <button
            className="secondary"
            onClick={load}
            disabled={loading || busy}
          >
            <RefreshCw size={17} />
            Обновить
          </button>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
            {error.includes("Войдите") && (
              <p>
                <a
                  href="/signin-with-chatgpt?return_to=%2F%3Fview%3Dadmin"
                  target="_top"
                >
                  Войти через ChatGPT →
                </a>
              </p>
            )}
          </div>
        )}
        {notice && (
          <p className="notice" role="status">
            <Check size={18} />
            {notice}
          </p>
        )}
        {loading ? (
          <p>Загружаем кабинет…</p>
        ) : tab === "Заявки" ? (
          <>
            <div className="stats">
              <div>
                <span>Новые</span>
                <strong>
                  {orders.filter((o) => o.status === "new").length}
                </strong>
              </div>
              <div>
                <span>Согласованы</span>
                <strong>
                  {orders.filter((o) => o.status === "agreed").length}
                </strong>
              </div>
              <div>
                <span>Завершённые работы</span>
                <strong>
                  {money(
                    orders
                      .filter((o) => o.status === "done")
                      .reduce((n, o) => n + (o.finalPrice || 0), 0),
                  )}
                </strong>
              </div>
            </div>
            <div className="filter-row">
              <label className="search">
                <Search size={18} />
                <input
                  aria-label="Поиск заявок"
                  placeholder="Имя, телефон, адрес или номер"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select
                aria-label="Фильтр по статусу"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Все статусы</option>
                {Object.entries(statuses).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {!shown.length ? (
              <div className="empty">
                <Inbox size={40} />
                <h3>
                  {orders.length
                    ? "Ничего не найдено"
                    : "Заявки появятся здесь"}
                </h3>
                <p>
                  {orders.length
                    ? "Измените поиск или статус."
                    : "Отправьте пробную заявку через клиентскую страницу."}
                </p>
                <a href="/" className="secondary">
                  Перейти к каталогу <ArrowUpRight size={18} />
                </a>
              </div>
            ) : (
              <div className="order-table">
                <div className="table-head">
                  <span>Клиент и мебель</span>
                  <span>Статус</span>
                  <span>Стоимость</span>
                  <span>Получена</span>
                </div>
                {shown.map((o) => (
                  <button
                    key={o.id}
                    className="table-row"
                    onClick={() => setSelected({ ...o })}
                  >
                    <div>
                      <strong>{o.name}</strong>
                      <p>
                        {o.items
                          .map(
                            (i: Item) =>
                              catalog.find((c) => c.id === i.kind)?.short +
                              " × " +
                              i.qty,
                          )
                          .join(", ")}
                      </p>
                      <small>{o.phone}</small>
                    </div>
                    <span className={"status " + o.status}>
                      {statuses[o.status]}
                    </span>
                    <b>{money(o.finalPrice ?? o.quote.total)}</b>
                    <small>
                      {new Date(o.created).toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : tab === "Доступ" ? (
          <section className="settings-card">
            <ShieldCheck size={32} />
            <h2>Ваш кабинет защищён</h2>
            <p>
              Вход через ChatGPT. Изменять настройки и заказы может только
              аккаунт владельца, который первым открыл кабинет этого частного
              приложения.
            </p>
            <p>
              Клиентская ссылка даёт доступ к одной заявке. По номеру телефона
              открыть чужой заказ нельзя.
            </p>
            <a
              className="secondary"
              href="/signout-with-chatgpt?return_to=%2F"
              target="_top"
            >
              Выйти из аккаунта
            </a>
          </section>
        ) : (
          <form className="settings-card" onSubmit={saveConfig}>
            {tab === "Тарифы" && (
              <>
                <h2>Стоимость чистки</h2>
                <div className="form-grid">
                  {catalog
                    .filter((c) => c.id !== "other")
                    .map((c) => (
                      <label key={c.id}>
                        {c.name}, ₽
                        <input
                          required
                          min="1"
                          max="1000000"
                          type="number"
                          value={cfg.prices[c.id]}
                          onChange={(e) =>
                            setCfg({
                              ...cfg,
                              prices: {
                                ...cfg.prices,
                                [c.id]: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                </div>
                <h3>Доплаты и скидки</h3>
                <div className="form-grid">
                  {numberField("min", "Минимальный заказ, ₽")}
                  {numberField("delivery", "Выезд за город, ₽")}
                  {numberField("dirty", "Сильное загрязнение, %", 100)}
                  {numberField("both", "Вторая сторона матраса, %", 100)}
                  {numberField("discount", "Скидка на комплект, %", 100)}
                  {numberField("discountFrom", "Предметов для скидки")}
                </div>
                <p className="fine">
                  Сначала применяются доплаты к предметам, затем скидка,
                  минимальный заказ и выезд. Уже отправленные заявки сохраняют
                  расчёт на момент отправки.
                </p>
              </>
            )}
            {tab === "Компания" && (
              <>
                <h2>О вашем сервисе</h2>
                <div className="form-grid">
                  {(["name", "city", "phone", "territory"] as const).map(
                    (k, i) => (
                      <label key={k}>
                        {
                          [
                            "Название",
                            "Город",
                            "Контактный телефон",
                            "Территория выезда",
                          ][i]
                        }
                        <input
                          required={k === "name"}
                          value={cfg[k]}
                          onChange={(e) =>
                            setCfg({ ...cfg, [k]: e.target.value })
                          }
                        />
                      </label>
                    ),
                  )}
                  <label className="span2">
                    Заголовок на главной
                    <textarea
                      maxLength={120}
                      value={cfg.intro}
                      onChange={(e) =>
                        setCfg({ ...cfg, intro: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Основной цвет
                    <input
                      type="color"
                      value={cfg.accent}
                      onChange={(e) =>
                        setCfg({ ...cfg, accent: e.target.value })
                      }
                    />
                  </label>
                  <label className="span2">
                    Обработка данных и контакты исполнителя
                    <textarea
                      required
                      minLength={20}
                      value={cfg.privacy}
                      onChange={(e) =>
                        setCfg({ ...cfg, privacy: e.target.value })
                      }
                    />
                  </label>
                </div>
              </>
            )}
            {tab === "Игра" && (
              <>
                <h2>Бонус за чистый диван</h2>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={cfg.game}
                    onChange={(e) => setCfg({ ...cfg, game: e.target.checked })}
                  />
                  Показывать игру после заявки
                </label>
                <div className="form-grid">
                  {numberField("bonus", "Бонус на следующий заказ, ₽")}
                  {numberField("bonusDays", "Срок действия, дней", 365)}
                </div>
                <p>
                  Клиент стирает шесть пятен с 3D-мебели. Бонус применяется
                  мастером вручную после проверки. Для каждой заявки выдаётся
                  один код.
                </p>
                <p className="fine">
                  Текущий заказ оплачивается по согласованной цене.
                  Автоматического учёта погашения бонусов в этой версии нет.
                </p>
              </>
            )}
            {tab === "Персонажи" && (
              <>
                <h2>Живая мебель</h2>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={cfg.character}
                    onChange={(e) =>
                      setCfg({ ...cfg, character: e.target.checked })
                    }
                  />
                  Добавить мебели дружелюбное лицо
                </label>
                <p>
                  В каталоге используются собственные объёмные модели. Их можно
                  вращать пальцем или мышью. Для устройств без WebGL
                  предусмотрен запасной экран.
                </p>
              </>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Сохраняем…" : "Сохранить настройки"}
              <Check size={18} />
            </button>
          </form>
        )}
      </main>
      {selected && (
        <div className="overlay">
          <section
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Редактировать заявку"
          >
            <div className="drawer-head">
              <h2>{selected.name}</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelected(null)}
                disabled={busy}
              >
                ✕
              </button>
            </div>
            <a href={"tel:" + selected.phone}>{selected.phone}</a>
            <p>
              {selected.address}
              {selected.outside ? " · за городом" : ""}
            </p>
            <p>
              Пожелания по времени ·{" "}
              {[selected.date, selected.time].filter(Boolean).join(" ") ||
                "Не указаны"}
            </p>
            <p>{selected.comment}</p>
            <div className="photo-list">
              {selected.photos.map((p: string) => (
                <a
                  key={p}
                  target="_blank"
                  href={"/api/order/" + selected.token + "/photo/" + p}
                >
                  <img
                    src={"/api/order/" + selected.token + "/photo/" + p}
                    alt="Фото клиента"
                  />
                </a>
              ))}
            </div>
            {selected.items.map((i: Item, n: number) => (
              <div className="order-line" key={n}>
                <span>
                  {catalog.find((c) => c.id === i.kind)?.name} × {i.qty}
                  <small>
                    {[
                      i.dirty ? "Сильное загрязнение" : "",
                      i.both ? "Обе стороны" : "",
                      i.dimensions,
                      i.description,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </span>
                <b>{money(selected.quote.lines[n].amount)}</b>
              </div>
            ))}
            <p>
              Предварительно · <b>{money(selected.quote.total)}</b>
            </p>
            {selected.bonus && (
              <p className="notice">
                Бонус {selected.bonus.code} · {money(selected.bonus.amount)}
              </p>
            )}
            <form onSubmit={saveOrder}>
              <label>
                Статус
                <select
                  value={selected.status}
                  onChange={(e) =>
                    setSelected({ ...selected, status: e.target.value })
                  }
                >
                  {Object.entries(statuses).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid">
                <label>
                  Согласованная цена, ₽
                  <input
                    min="0"
                    type="number"
                    value={selected.finalPrice ?? ""}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        finalPrice:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Согласованные дата и время
                  <input
                    type="datetime-local"
                    value={selected.scheduled}
                    onChange={(e) =>
                      setSelected({ ...selected, scheduled: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                Внутренняя заметка
                <textarea
                  value={selected.note}
                  onChange={(e) =>
                    setSelected({ ...selected, note: e.target.value })
                  }
                />
              </label>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary wide" disabled={busy}>
                {busy ? "Сохраняем…" : "Сохранить заявку"}
              </button>
              <a
                className="text-button wide"
                href={"/?order=" + selected.token}
                target="_blank"
              >
                Открыть страницу клиента <ArrowUpRight size={16} />
              </a>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
