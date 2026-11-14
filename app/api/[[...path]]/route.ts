import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { z } from "zod";
import { defaults, quote, type Config } from "@/lib/domain";
export const dynamic = "force-dynamic";
const itemSchema = z.object({
  kind: z.enum([
    "sofa2",
    "sofa3",
    "corner",
    "chair",
    "mattress1",
    "mattress2",
    "stool",
    "other",
  ]),
  qty: z.number().int().min(1).max(20),
  dirty: z.boolean(),
  both: z.boolean(),
  dimensions: z.string().max(100),
  description: z.string().max(500),
});
const inputSchema = z.object({
  id: z.string().uuid(),
  items: z.array(itemSchema).min(1).max(30),
  name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .regex(/^\+?[\d ()-]{10,22}$/)
    .refine((s) => s.replace(/\D/g, "").length >= 10),
  address: z.string().trim().min(5).max(500),
  outside: z.boolean(),
  date: z.string().max(40),
  time: z.string().max(50),
  comment: z.string().max(2000),
  consent: z.literal(true),
});
const number = z.number().int().min(0).max(1000000);
const configSchema = z.object({
  name: z.string().trim().min(1).max(50),
  city: z.string().max(80),
  phone: z.string().max(30),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  intro: z.string().max(120),
  territory: z.string().max(200),
  privacy: z.string().min(20).max(3000),
  prices: z.object({
    sofa2: number,
    sofa3: number,
    corner: number,
    chair: number,
    mattress1: number,
    mattress2: number,
    stool: number,
    other: z.literal(0),
  }),
  min: number,
  dirty: number.max(100),
  both: number.max(100),
  delivery: number,
  discount: number.max(100),
  discountFrom: number.min(1),
  game: z.boolean(),
  bonus: number,
  bonusDays: number.min(1).max(365),
  character: z.boolean(),
});
function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
async function configRow() {
  return env
    .DB!.prepare("SELECT * FROM settings WHERE id=1")
    .first<{ owner: string; data: string }>();
}
async function owner(initialize = false) {
  const h = await headers();
  const user = h.get("oai-authenticated-user-id");
  if (!user) throw new Error("Войдите в аккаунт владельца|401");
  const existing = await configRow();
  if (initialize && !existing) {
    const email = h.get("oai-authenticated-user-email")?.trim().toLowerCase();
    if (!env.TIKHO_OWNER_EMAIL || email !== env.TIKHO_OWNER_EMAIL.trim().toLowerCase())
      throw new Error("Доступ только владельцу|403");
    await env
      .DB!.prepare(
        "INSERT INTO settings(id,owner,data) VALUES(1,?,?) ON CONFLICT(id) DO NOTHING",
      )
      .bind(user, JSON.stringify(defaults))
      .run();
  }
  const row = await configRow();
  if (!row || row.owner !== user)
    throw new Error("Доступ только владельцу|403");
  return row;
}
async function config() {
  const row = await configRow();
  return row ? (JSON.parse(row.data) as Config) : defaults;
}
type OrderRow = {
  id: string;
  token: string;
  created: string;
  status: string;
  data: string;
  version: number;
};
function unpack(row: OrderRow) {
  return { ...row, ...JSON.parse(row.data), data: undefined };
}
async function handle(request: Request) {
  try {
    if (!env.DB || !env.BUCKET)
      throw new Error("Хранилище временно недоступно|503");
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/?/, "").split("/");
    if (
      request.method !== "GET" &&
      request.headers.get("origin") !== url.origin
    )
      throw new Error("Недопустимый источник запроса|403");
    if (path[0] === "config" && request.method === "GET")
      return json(await config());
    if (path[0] === "admin") {
      const row = await owner(request.method === "GET");
      if (request.method === "GET") {
        const result = await env.DB.prepare(
          "SELECT * FROM orders ORDER BY created DESC LIMIT 1000",
        ).all<OrderRow>();
        return json({
          config: JSON.parse(row.data),
          orders: result.results.map(unpack),
        });
      }
      if (path[1] === "config" && request.method === "PUT") {
        const data = configSchema.parse(await request.json());
        await env.DB.prepare("UPDATE settings SET data=? WHERE id=1")
          .bind(JSON.stringify(data))
          .run();
        return json(data);
      }
      if (path[1] === "order" && request.method === "PUT") {
        const update = z
          .object({
            id: z.string().uuid(),
            version: z.number().int(),
            status: z.enum(["new", "agreed", "done", "cancelled"]),
            finalPrice: number.nullable(),
            scheduled: z.string().max(80),
            note: z.string().max(2000),
          })
          .parse(await request.json());
        if (
          update.status === "agreed" &&
          (update.finalPrice === null || !update.scheduled)
        )
          throw new Error("Укажите согласованные цену и время|400");
        const old = await env.DB.prepare("SELECT * FROM orders WHERE id=?")
          .bind(update.id)
          .first<OrderRow>();
        if (!old) throw new Error("Заявка не найдена|404");
        const data = {
          ...JSON.parse(old.data),
          finalPrice: update.finalPrice,
          scheduled: update.scheduled,
          note: update.note,
        };
        const saved = await env.DB.prepare(
          "UPDATE orders SET status=?,data=?,version=version+1 WHERE id=? AND version=?",
        )
          .bind(update.status, JSON.stringify(data), update.id, update.version)
          .run();
        if (!saved.meta.changes)
          throw new Error("Заявка уже изменилась. Обновите список|409");
        return json({ ok: true });
      }
    }
    if (path[0] === "orders" && request.method === "POST") {
      if (Number(request.headers.get("content-length") || 0) > 16000000)
        throw new Error("Фотографии слишком большие|413");
      const form = await request.formData();
      const input = inputSchema.parse(JSON.parse(String(form.get("data"))));
      const duplicate = await env.DB.prepare(
        "SELECT token FROM orders WHERE id=?",
      )
        .bind(input.id)
        .first<{ token: string }>();
      if (duplicate) return json(duplicate);
      const files = form
        .getAll("photos")
        .filter((f): f is File => f instanceof File && f.size > 0);
      if (files.length > 3 || files.some((f) => f.size > 5000000))
        throw new Error("До трёх фотографий по 5 МБ|400");
      if (input.items.some((i) => i.kind === "other") && !files.length)
        throw new Error("Для другой мебели добавьте фотографию|400");
      if (input.items.some((i) => i.kind === "other" && !i.description.trim()))
        throw new Error("Опишите другую мебель|400");
      const cfg = await config();
      const token =
        crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
      const photos: string[] = [];
      try {
        for (const file of files) {
          const bytes = new Uint8Array(await file.arrayBuffer());
          let type = "";
          if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
            type = "image/jpeg";
          else if (
            bytes[0] === 137 &&
            bytes[1] === 80 &&
            bytes[2] === 78 &&
            bytes[3] === 71
          )
            type = "image/png";
          else if (
            new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
            new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
          )
            type = "image/webp";
          if (!type) throw new Error("Нужны JPEG, PNG или WebP|400");
          const key = token + "/" + crypto.randomUUID();
          await env.BUCKET.put(key, bytes, {
            httpMetadata: { contentType: type },
          });
          photos.push(key.split("/")[1]);
        }
        const data = {
          ...input,
          quote: quote(input.items, input.outside, cfg),
          photos,
          company: cfg.name,
          finalPrice: null,
          scheduled: "",
          note: "",
          bonus: null,
        };
        await env.DB.prepare(
          "INSERT INTO orders(id,token,created,status,data,version) VALUES(?,?,?,?,?,1)",
        )
          .bind(
            input.id,
            token,
            new Date().toISOString(),
            "new",
            JSON.stringify(data),
          )
          .run();
        return json({ token }, 201);
      } catch (e) {
        await Promise.all(
          photos.map((p) => env.BUCKET!.delete(token + "/" + p)),
        );
        const existing = await env.DB.prepare(
          "SELECT token FROM orders WHERE id=?",
        )
          .bind(input.id)
          .first<{ token: string }>();
        if (existing) return json(existing);
        throw e;
      }
    }
    if (path[0] === "order" && path[1]) {
      const row = await env.DB.prepare("SELECT * FROM orders WHERE token=?")
        .bind(path[1])
        .first<OrderRow>();
      if (!row) throw new Error("Заявка не найдена|404");
      if (path[2] === "photo" && path[3] && request.method === "GET") {
        if (!JSON.parse(row.data).photos.includes(path[3]))
          throw new Error("Фото не найдено|404");
        const obj = await env.BUCKET.get(row.token + "/" + path[3]);
        if (!obj) throw new Error("Фото не найдено|404");
        return new Response(obj.body, {
          headers: {
            "Content-Type": obj.httpMetadata?.contentType || "image/jpeg",
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      if (path[2] === "bonus" && request.method === "POST") {
        const cfg = await config();
        if (!cfg.game) throw new Error("Бонус отключён|400");
        const data = JSON.parse(row.data);
        if (data.bonus) return json(data.bonus);
        data.bonus = {
          amount: cfg.bonus,
          code: "TIHO-" + row.id.slice(0, 8).toUpperCase(),
          expires: new Date(
            Date.now() + cfg.bonusDays * 86400000,
          ).toISOString(),
          manual: true,
        };
        const result = await env.DB.prepare(
          "UPDATE orders SET data=?,version=version+1 WHERE id=? AND version=?",
        )
          .bind(JSON.stringify(data), row.id, row.version)
          .run();
        if (!result.meta.changes)
          throw new Error("Заявка обновилась. Попробуйте снова|409");
        return json(data.bonus);
      }
      if (request.method === "GET") {
        const data = unpack(row);
        delete data.note;
        return json(data);
      }
    }
    return json({ error: "Страница не найдена" }, 404);
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        { error: "Проверьте обязательные поля и числовые значения" },
        400,
      );
    const [message, code] = String(
      error instanceof Error ? error.message : error,
    ).split("|");
    if (code) return json({ error: message }, Number(code));
    console.error("API operation failed", error);
    return json(
      { error: "Не удалось сохранить данные. Попробуйте ещё раз" },
      500,
    );
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
