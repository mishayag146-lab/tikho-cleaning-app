"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Minus,
  ShoppingBag,
  X,
  Check,
  MapPin,
  ImagePlus,
  Trash2,
  ShieldCheck,
  Leaf,
  Clock3,
} from "lucide-react";
import {
  catalog,
  defaults,
  quote,
  money,
  statuses,
  type Config,
  type Item,
  type Kind,
} from "@/lib/domain";
import { api, jsonOptions, photoStore } from "@/lib/client";
import Furniture from "./furniture";
import Admin from "./admin";
const blank = {
  name: "",
  phone: "",
  address: "",
  outside: false,
  date: "",
  time: "",
  comment: "",
  consent: false,
};
export default function Shop() {
  const [cfg, setCfg] = useState<Config>(defaults);
  const [items, setItems] = useState<Item[]>([]);
  const [kind, setKind] = useState<Kind>("sofa2");
  const [dirty, setDirty] = useState(false);
  const [both, setBoth] = useState(false);
  const [dimensions, setDimensions] = useState("");
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState(1);
  const [form, setForm] = useState(blank);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [basket, setBasket] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [view, setView] = useState("shop");
  const [token, setToken] = useState("");
  const [requestId, setRequestId] = useState("");
  const [photoError, setPhotoError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setView(
      params.has("order")
        ? "order"
        : params.get("view") === "admin"
          ? "admin"
          : "shop",
    );
    setToken(params.get("order") || "");
    api("config")
      .then(setCfg)
      .catch((e) => setError(e.message));
    try {
      const draft = JSON.parse(localStorage.getItem("tikho-draft") || "null");
      if (draft && Array.isArray(draft.items)) {
        setItems(draft.items);
        setForm({ ...blank, ...draft.form });
        setRequestId(draft.id || crypto.randomUUID());
      } else setRequestId(crypto.randomUUID());
    } catch {
      setRequestId(crypto.randomUUID());
    }
    photoStore()
      .then(setFiles)
      .catch(() =>
        setPhotoError(
          "Браузер не сохраняет фото между открытиями. Добавьте их перед отправкой.",
        ),
      )
      .finally(() => setReady(true));
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          "tikho-draft",
          JSON.stringify({ items, form, id: requestId }),
        );
      } catch {
        setError("Черновик не удалось сохранить на устройстве");
      }
  }, [items, form, ready, requestId]);
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", cfg.accent);
  }, [cfg.accent]);
  const selected = { kind, qty, dirty, both, dimensions, description };
  const calculation = quote(items, form.outside, cfg);
  const selectedPrice = quote([selected], false, {
    ...cfg,
    min: 0,
    discount: 0,
  }).total;
  function add() {
    if (kind === "other" && !description.trim()) {
      setError("Опишите мебель, которую нужно почистить");
      return;
    }
    setItems((old) => {
      const found = old.findIndex(
        (i) =>
          i.kind === kind &&
          i.dirty === dirty &&
          i.both === both &&
          i.dimensions === dimensions &&
          i.description === description,
      );
      if (found < 0) return [...old, selected];
      return old.map((i, n) =>
        n === found ? { ...i, qty: Math.min(20, i.qty + qty) } : i,
      );
    });
    setNotice("Добавлено в заявку");
    setError("");
  }
  async function changePhotos(next: File[]) {
    if (next.length > 3) {
      setPhotoError("Можно добавить до трёх фотографий");
      return;
    }
    if (
      next.some(
        (f) =>
          f.size > 5e6 ||
          !["image/jpeg", "image/png", "image/webp"].includes(f.type),
      )
    ) {
      setPhotoError("Выберите JPEG, PNG или WebP до 5 МБ");
      return;
    }
    setFiles(next);
    setPhotoError("");
    try {
      await photoStore(next);
    } catch {
      setPhotoError(
        "Фото добавлены. При обновлении страницы потребуется добавить их снова.",
      );
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!items.length) return;
    if (items.some((i) => i.kind === "other") && !files.length) {
      setPhotoError("Для другой мебели нужна хотя бы одна фотография");
      return;
    }
    setBusy(true);
    try {
      const payload = new FormData();
      payload.set("data", JSON.stringify({ id: requestId, items, ...form }));
      files.forEach((f) => payload.append("photos", f));
      const result = await api("orders", { method: "POST", body: payload });
      localStorage.removeItem("tikho-draft");
      await photoStore([]).catch(() => {});
      location.href = "/?order=" + result.token;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (view === "admin") return <Admin config={cfg} />;
  return (
    <>
      <header className="header">
        <a href="/" className="brand">
          {cfg.name.toLowerCase()}
          <span className="brand-dot">.</span>
        </a>
        <nav>
          <a href="/#catalog">Рассчитать стоимость</a>
          <a href="/#how">Как всё устроено</a>
        </nav>
        <div className="header-actions">
          <a href="/?view=admin" className="owner-link">
            Кабинет мастера <ArrowUpRight size={15} />
          </a>
          {view === "shop" && (
            <button
              className="bag"
              onClick={() => {
                setBasket(true);
                setStep(1);
              }}
              aria-label="Открыть заявку"
            >
              <ShoppingBag size={20} />
              <span>{items.reduce((n, i) => n + i.qty, 0)}</span>
            </button>
          )}
        </div>
      </header>
      {view === "order" ? (
        <Order token={token} config={cfg} />
      ) : (
        <main>
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <span /> Выездная химчистка мебели
              </div>
              <h1>
                {cfg.intro.split("\n").map((s, i) => (
                  <span key={i}>
                    {s}
                    <br />
                  </span>
                ))}
              </h1>
              <p className="hero-text">
                Любимым вещам — свежий старт.
                <br />
                Выберите мебель, узнайте стоимость
                <br className="desktop" /> и оставьте остальное нам.
              </p>
              <a className="primary" href="#catalog">
                Рассчитать стоимость <ArrowUpRight size={20} />
              </a>
              <div className="hero-note">
                <MapPin size={15} />
                {cfg.city} · {cfg.territory}
              </div>
            </div>
            <div className="hero-art">
              <div className="hero-orbit" />
              <div className="floating-label">
                <span className="tiny-dot" /> Забота в каждом касании
              </div>
              <Furniture kind={kind} character={cfg.character} />
              <div className="art-caption">
                <span>ВАША МЕБЕЛЬ, ТОЛЬКО СВЕЖЕЕ</span>
                <span>Снова любимое место</span>
              </div>
            </div>
          </section>
          <section className="benefits">
            <div>
              <Leaf />
              <span>Бережно к обивке</span>
            </div>
            <div>
              <ShieldCheck />
              <span>Цена согласуется до выезда</span>
            </div>
            <div>
              <Clock3 />
              <span>Заявка за пару минут</span>
            </div>
          </section>
          <section id="catalog" className="catalog-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Рассчитаем вместе</span>
                <h2>Что освежим сегодня?</h2>
              </div>
              <p>
                Предварительная стоимость сразу.
                <br />
                Детали мастер уточнит по фото.
              </p>
            </div>
            <div className="catalog-grid">
              <div className="selection">
                <div className="kind-grid">
                  {catalog.map((c) => (
                    <button
                      key={c.id}
                      className={
                        "kind-card " + (kind === c.id ? "selected" : "")
                      }
                      onClick={() => {
                        setKind(c.id);
                        setBoth(false);
                        setDimensions("");
                        setDescription("");
                      }}
                    >
                      <span
                        className={
                          "mini-furniture " +
                          (c.id.startsWith("mattress")
                            ? "mattress"
                            : c.id === "stool"
                              ? "stool"
                              : "")
                        }
                        style={
                          {
                            "--furniture-color": c.color,
                          } as React.CSSProperties
                        }
                      >
                        <i />
                        <b />
                      </span>
                      <strong>{c.name}</strong>
                      <span>
                        {c.id === "other"
                          ? "Оценим по фото"
                          : "от " + money(cfg.prices[c.id])}
                      </span>
                      {kind === c.id && (
                        <Check className="selected-check" size={16} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="configure">
                <span className="eyebrow">Ваша мебель</span>
                <h3>{catalog.find((c) => c.id === kind)?.name}</h3>
                <div className="config-row">
                  <span>Количество</span>
                  <div className="stepper">
                    <button
                      aria-label="Уменьшить количество"
                      disabled={qty === 1}
                      onClick={() => setQty(qty - 1)}
                    >
                      <Minus size={16} />
                    </button>
                    <b>{qty}</b>
                    <button
                      aria-label="Увеличить количество"
                      disabled={qty === 20}
                      onClick={() => setQty(qty + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                {kind !== "other" && (
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={dirty}
                      onChange={(e) => setDirty(e.target.checked)}
                    />
                    <span>Сильное загрязнение</span>
                    <small>+{cfg.dirty}%</small>
                  </label>
                )}
                {kind.startsWith("mattress") && (
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={both}
                      onChange={(e) => setBoth(e.target.checked)}
                    />
                    <span>Почистить обе стороны</span>
                    <small>+{cfg.both}%</small>
                  </label>
                )}
                {kind === "other" ? (
                  <label>
                    Что нужно почистить?
                    <textarea
                      maxLength={500}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Например, мягкое изголовье кровати"
                    />
                  </label>
                ) : (
                  <label>
                    Размеры, если знаете
                    <input
                      maxLength={100}
                      value={dimensions}
                      onChange={(e) => setDimensions(e.target.value)}
                      placeholder="Например, 200 × 90 см"
                    />
                  </label>
                )}
                <div className="config-price">
                  <span>
                    {kind === "other"
                      ? "Индивидуальная оценка"
                      : "За выбранную мебель"}
                  </span>
                  <strong>{money(selectedPrice)}</strong>
                </div>
                <button className="primary wide" onClick={add}>
                  Добавить в заявку <Plus size={20} />
                </button>
                <p className="fine">
                  Минимальный заказ {money(cfg.min)}. Размеры помогут мастеру
                  уточнить оценку.
                </p>
              </div>
            </div>
          </section>
          <section id="how" className="how">
            <div>
              <span className="eyebrow">Всё просто</span>
              <h2>
                От заявки
                <br />
                до свежего дивана
              </h2>
            </div>
            <div className="how-steps">
              <article>
                <ImagePlus />
                <h3>Покажите мебель</h3>
                <p>
                  Выберите предметы и добавьте фотографии — так мастер точнее
                  оценит работу.
                </p>
              </article>
              <article>
                <Check />
                <h3>Согласуйте детали</h3>
                <p>
                  Мастер свяжется с вами, уточнит цену и удобное время. Статус
                  появится по вашей ссылке.
                </p>
              </article>
              <article>
                <Leaf />
                <h3>Устройтесь поудобнее</h3>
                <p>
                  Специалист приедет с оборудованием. После чистки расскажет об
                  уходе и сушке.
                </p>
              </article>
            </div>
          </section>
        </main>
      )}
      <footer>
        <a className="brand" href="/">
          {cfg.name.toLowerCase()}.
        </a>
        <span>Забота о доме начинается с малого.</span>
        {cfg.phone ? (
          <a href={"tel:" + cfg.phone}>{cfg.phone}</a>
        ) : (
          <a href="/?view=admin">
            Настроить компанию <ArrowUpRight size={14} />
          </a>
        )}
        <details>
          <summary>Обработка данных</summary>
          <p>{cfg.privacy}</p>
        </details>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
      {error && !basket && (
        <div className="inline-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>
      )}
      {items.length > 0 && !basket && view === "shop" && (
        <button className="mobile-cart" onClick={() => setBasket(true)}>
          <ShoppingBag size={18} /> Ваша заявка · {money(calculation.total)}{" "}
          <ArrowRight size={18} />
        </button>
      )}
      {basket && (
        <div
          className="overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setBasket(false);
          }}
        >
          <section
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Ваша заявка"
          >
            <div className="drawer-head">
              <div>
                <span className="eyebrow">
                  {step === 1 ? "Выбранная мебель" : "Контактные данные"}
                </span>
                <h2>{step === 1 ? "Ваша заявка" : "Куда приехать?"}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setBasket(false)}
                disabled={busy}
                aria-label="Закрыть заявку"
              >
                <X />
              </button>
            </div>
            {!items.length ? (
              <div className="empty">
                <ShoppingBag size={38} />
                <h3>Пока здесь пусто</h3>
                <p>Добавьте мебель из каталога.</p>
                <button className="primary" onClick={() => setBasket(false)}>
                  Выбрать мебель
                </button>
              </div>
            ) : (
              <>
                {step === 1 ? (
                  <>
                    <div className="basket-items">
                      {calculation.lines.map((i, index) => (
                        <div className="basket-item" key={index}>
                          <div>
                            <strong>
                              {catalog.find((c) => c.id === i.kind)?.name}
                            </strong>
                            <p>
                              {[
                                i.dirty ? "Сильное загрязнение" : "",
                                i.both ? "Обе стороны" : "",
                                i.dimensions,
                                i.description,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "Стандартная чистка"}
                            </p>
                            <b>{money(i.amount)}</b>
                          </div>
                          <div className="basket-controls">
                            <button
                              className="icon-button"
                              aria-label="Удалить предмет"
                              onClick={() =>
                                setItems(items.filter((_, n) => n !== index))
                              }
                            >
                              <Trash2 size={17} />
                            </button>
                            <div className="stepper">
                              <button
                                aria-label="Уменьшить"
                                disabled={i.qty <= 1}
                                onClick={() =>
                                  setItems(
                                    items.map((it, n) =>
                                      n === index
                                        ? { ...it, qty: it.qty - 1 }
                                        : it,
                                    ),
                                  )
                                }
                              >
                                <Minus size={14} />
                              </button>
                              {i.qty}
                              <button
                                aria-label="Увеличить"
                                disabled={i.qty >= 20}
                                onClick={() =>
                                  setItems(
                                    items.map((it, n) =>
                                      n === index
                                        ? { ...it, qty: it.qty + 1 }
                                        : it,
                                    ),
                                  )
                                }
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Totals calculation={calculation} />
                    <button className="primary wide" onClick={() => setStep(2)}>
                      Продолжить <ArrowRight size={18} />
                    </button>
                    <button
                      className="text-button wide"
                      onClick={() => setBasket(false)}
                    >
                      Добавить ещё мебель
                    </button>
                  </>
                ) : (
                  <form onSubmit={submit}>
                    <div className="form-grid">
                      <label>
                        Ваше имя
                        <input
                          required
                          minLength={2}
                          maxLength={100}
                          autoComplete="name"
                          value={form.name}
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Телефон
                        <input
                          required
                          type="tel"
                          minLength={10}
                          maxLength={22}
                          autoComplete="tel"
                          placeholder="+7 999 123-45-67"
                          value={form.phone}
                          onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                          }
                        />
                      </label>
                      <label className="span2">
                        Адрес
                        <input
                          required
                          minLength={5}
                          maxLength={500}
                          autoComplete="street-address"
                          placeholder="Улица, дом, квартира"
                          value={form.address}
                          onChange={(e) =>
                            setForm({ ...form, address: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Желаемая дата
                        <input
                          type="date"
                          value={form.date}
                          onChange={(e) =>
                            setForm({ ...form, date: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Удобное время
                        <select
                          value={form.time}
                          onChange={(e) =>
                            setForm({ ...form, time: e.target.value })
                          }
                        >
                          <option value="">Обсудим с мастером</option>
                          <option>Утро · 9–12</option>
                          <option>День · 12–17</option>
                          <option>Вечер · 17–20</option>
                        </select>
                      </label>
                    </div>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={form.outside}
                        onChange={(e) =>
                          setForm({ ...form, outside: e.target.checked })
                        }
                      />
                      Выезд за город <small>+{money(cfg.delivery)}</small>
                    </label>
                    <p className="fine">
                      Дата и время — пожелание. Мастер подтвердит запись после
                      разговора.
                    </p>
                    <label className="upload">
                      <ImagePlus size={24} />
                      <strong>Добавить фотографии</strong>
                      <span>До 3 фото · JPEG, PNG, WebP · до 5 МБ каждое</span>
                      <input
                        aria-label="Фотографии мебели"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={(e) => {
                          changePhotos([
                            ...files,
                            ...Array.from(e.target.files || []),
                          ]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <div className="photo-list">
                      {previews.map((p, i) => (
                        <div key={p}>
                          <img src={p} alt={"Фото мебели " + (i + 1)} />
                          <button
                            type="button"
                            aria-label="Удалить фото"
                            onClick={() =>
                              changePhotos(files.filter((_, n) => n !== i))
                            }
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {photoError && (
                      <p className="error" role="alert">
                        {photoError}
                      </p>
                    )}
                    <label>
                      Комментарий
                      <textarea
                        value={form.comment}
                        maxLength={2000}
                        onChange={(e) =>
                          setForm({ ...form, comment: e.target.value })
                        }
                        placeholder="Пятна, домашние животные, особенности доступа…"
                      />
                    </label>
                    <Totals calculation={calculation} />
                    <label className="check-row consent">
                      <input
                        required
                        type="checkbox"
                        checked={form.consent}
                        onChange={(e) =>
                          setForm({ ...form, consent: e.target.checked })
                        }
                      />
                      <span>
                        Согласен на обработку контактов и фотографий для
                        выполнения заявки.
                      </span>
                    </label>
                    <details className="fine">
                      <summary>Как используются данные</summary>
                      <p>{cfg.privacy}</p>
                    </details>
                    {error && (
                      <p className="error" role="alert">
                        {error}
                      </p>
                    )}
                    <button className="primary wide" disabled={busy}>
                      {busy ? "Сохраняем заявку…" : "Отправить заявку"}
                      <ArrowRight size={18} />
                    </button>
                    <button
                      className="text-button wide"
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={busy}
                    >
                      Вернуться к мебели
                    </button>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
function Totals({ calculation: c }: { calculation: ReturnType<typeof quote> }) {
  return (
    <div className="totals">
      <div>
        <span>Чистка мебели</span>
        <b>{money(c.subtotal || null)}</b>
      </div>
      {c.discount > 0 && (
        <div>
          <span>Скидка за несколько предметов</span>
          <b>−{money(c.discount)}</b>
        </div>
      )}
      {c.minimum > 0 && (
        <div>
          <span>До минимального заказа</span>
          <b>+{money(c.minimum)}</b>
        </div>
      )}
      {c.delivery > 0 && (
        <div>
          <span>Выезд за город</span>
          <b>+{money(c.delivery)}</b>
        </div>
      )}
      <div className="total">
        <span>Предварительно</span>
        <strong>{money(c.total)}</strong>
      </div>
      {c.manual && (
        <p className="fine">
          Другая мебель оценивается отдельно по фото и добавляется к сумме после
          согласования.
        </p>
      )}
      <p className="fine">Окончательную цену мастер подтвердит до выезда.</p>
    </div>
  );
}
function Order({ token, config }: { token: string; config: Config }) {
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [won, setWon] = useState(false);
  const [busy, setBusy] = useState(false);
  async function refresh() {
    try {
      setOrder(await api("order/" + token));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!token) return;
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [token]);
  async function bonus() {
    setBusy(true);
    try {
      const b = await api("order/" + token + "/bonus", { method: "POST" });
      setOrder({ ...order, bonus: b });
      setPlaying(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!order)
    return (
      <main className="order-page">
        <h1>{error || "Загружаем заявку…"}</h1>
        <button onClick={refresh}>Повторить</button>
      </main>
    );
  return (
    <main className="order-page">
      <div className="success-mark">
        <Check size={32} />
      </div>
      <span className="eyebrow">Заявка № {order.id.slice(0, 8)}</span>
      <h1>
        {order.status === "new"
          ? "Всё получили. Скоро свяжемся."
          : statuses[order.status]}
      </h1>
      <p>Сохраните эту страницу. Здесь появятся согласованные цена и время.</p>
      <div className="order-status">
        <span className={"status " + order.status}>
          {statuses[order.status]}
        </span>
        <span>{new Date(order.created).toLocaleString("ru-RU")}</span>
        <button className="text-button" onClick={refresh}>
          Обновить
        </button>
      </div>
      <section className="order-card">
        <div className="section-heading">
          <h3>{order.name}</h3>
          <strong>{money(order.finalPrice ?? order.quote.total)}</strong>
        </div>
        <p>{order.address}</p>
        <p>
          {order.scheduled
            ? "Согласованный выезд: " + order.scheduled
            : "Желаемый выезд: " +
              ([order.date, order.time].filter(Boolean).join(" · ") ||
                "Обсудим с мастером")}
        </p>
        {order.items.map((i: Item, n: number) => (
          <div className="order-line" key={n}>
            <span>
              {catalog.find((c) => c.id === i.kind)?.name} × {i.qty}
            </span>
            <span>{money(order.quote.lines[n].amount)}</span>
          </div>
        ))}
        {order.finalPrice === null && (
          <p className="fine">Пока указана предварительная оценка.</p>
        )}
        <div className="photo-list">
          {order.photos.map((p: string) => (
            <a
              key={p}
              href={"/api/order/" + token + "/photo/" + p}
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={"/api/order/" + token + "/photo/" + p}
                alt="Прикреплённое фото"
              />
            </a>
          ))}
        </div>
        <button
          className="secondary wide"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(location.href);
              setCopied(true);
            } catch {
              setError("Скопируйте адрес страницы из адресной строки");
            }
          }}
        >
          {copied ? "Ссылка скопирована" : "Скопировать ссылку на заявку"}
        </button>
        <p className="fine">
          Ссылка содержит доступ к вашим контактам и фото. Сохраните её для
          себя.
        </p>
      </section>
      {config.game && (
        <section className="game-card">
          <span className="eyebrow">Пока мастер смотрит заявку</span>
          <h2>Немного чистой радости</h2>
          {order.bonus ? (
            <>
              <h3>{money(order.bonus.amount)} на следующий заказ</h3>
              <p>
                Код {order.bonus.code} · до{" "}
                {new Date(order.bonus.expires).toLocaleDateString("ru-RU")}
              </p>
              <p className="fine">
                Сообщите код мастеру. Он проверит выполнение игры и применение
                бонуса вручную.
              </p>
            </>
          ) : (
            <>
              <p>
                Сотрите шесть пятен с дивана и получите бонус{" "}
                {money(config.bonus)} на следующий заказ.
              </p>
              {playing ? (
                <>
                  <Furniture
                    game
                    onClean={() => setWon(true)}
                    character={config.character}
                  />
                  {won && (
                    <button className="primary" disabled={busy} onClick={bonus}>
                      {busy ? "Сохраняем…" : "Получить бонус"}
                    </button>
                  )}
                  <button
                    className="text-button"
                    onClick={() => setPlaying(false)}
                  >
                    Закрыть игру
                  </button>
                </>
              ) : (
                <button className="secondary" onClick={() => setPlaying(true)}>
                  Поиграть
                </button>
              )}
            </>
          )}
        </section>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <a href="/" className="text-button">
        Вернуться в каталог
      </a>
    </main>
  );
}
