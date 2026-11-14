declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    TIKHO_OWNER_EMAIL?: string;
  }
}
