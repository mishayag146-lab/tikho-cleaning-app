export type Kind =
  | "sofa2"
  | "sofa3"
  | "corner"
  | "chair"
  | "mattress1"
  | "mattress2"
  | "stool"
  | "other";
export const catalog: {
  id: Kind;
  name: string;
  short: string;
  color: string;
}[] = [
  { id: "sofa2", name: "Диван · 2 места", short: "Диван", color: "#dfad80" },
  {
    id: "sofa3",
    name: "Диван · 3 места",
    short: "Большой диван",
    color: "#b8c5a4",
  },
  { id: "corner", name: "Угловой диван", short: "Угловой", color: "#c8ad98" },
  { id: "chair", name: "Кресло", short: "Кресло", color: "#b6bdc7" },
  {
    id: "mattress1",
    name: "Односпальный матрас",
    short: "Матрас",
    color: "#e1d5c5",
  },
  {
    id: "mattress2",
    name: "Двуспальный матрас",
    short: "Большой матрас",
    color: "#e1d5c5",
  },
  { id: "stool", name: "Стул", short: "Стул", color: "#b4bea7" },
  { id: "other", name: "Другая мебель", short: "Другое", color: "#cbbba8" },
];
export type Item = {
  kind: Kind;
  qty: number;
  dirty: boolean;
  both: boolean;
  dimensions: string;
  description: string;
};
export const defaults = {
  name: "Тихо",
  city: "Ваш город",
  phone: "",
  accent: "#49644d",
  intro: "Чистая мебель.\nСпокойный дом.",
  territory: "Город и ближайшие районы",
  privacy:
    "Контакты используются для согласования заявки. Фотографии нужны для оценки работы. Удаление данных можно запросить у исполнителя по указанным на сайте контактам.",
  prices: {
    sofa2: 2400,
    sofa3: 3200,
    corner: 4200,
    chair: 1400,
    mattress1: 1800,
    mattress2: 2600,
    stool: 450,
    other: 0,
  },
  min: 1800,
  dirty: 20,
  both: 40,
  delivery: 500,
  discount: 5,
  discountFrom: 3,
  game: true,
  bonus: 300,
  bonusDays: 30,
  character: true,
};
export type Config = typeof defaults;
export function quote(items: Item[], outside: boolean, c: Config) {
  const lines = items.map((i) => ({
    ...i,
    amount:
      i.kind === "other"
        ? null
        : Math.round(
            c.prices[i.kind] *
              i.qty *
              (1 + (i.dirty ? c.dirty : 0) / 100) *
              (1 +
                (i.both && i.kind.startsWith("mattress") ? c.both : 0) / 100),
          ),
  }));
  const subtotal = lines.reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const count = items
    .filter((i) => i.kind !== "other")
    .reduce((sum, i) => sum + i.qty, 0);
  const discount =
    count >= c.discountFrom ? Math.round((subtotal * c.discount) / 100) : 0;
  const minimum = subtotal > 0 ? Math.max(0, c.min - subtotal + discount) : 0;
  const delivery = outside ? c.delivery : 0;
  return {
    lines,
    subtotal,
    discount,
    minimum,
    delivery,
    total: subtotal > 0 ? subtotal - discount + minimum + delivery : null,
    manual: items.some((i) => i.kind === "other"),
  };
}
export const money = (n: number | null) =>
  n === null ? "По фото" : new Intl.NumberFormat("ru-RU").format(n) + " ₽";
export const statuses: Record<string, string> = {
  new: "Новая",
  agreed: "Согласована",
  done: "Завершена",
  cancelled: "Отменена",
};
