// Normalizes the puliziecondominialiverona.it form payloads into the shared capture() shape.
import { capture, json, identifySite, readJson, cleanText } from "./_shared.js";

const SITE_TAG = "puliziecondominialiverona";
const MESSAGES = {
  valid_email_required: "Inserisci un indirizzo email valido.",
  required_contact_or_consent_missing: "Controlla nome, telefono e consenso privacy.",
  privacy_consent_required: "Conferma di aver letto l'informativa privacy.",
  payload_too_large: "Richiesta troppo grande.",
  invalid_json: "Richiesta non valida.",
  invalid_payload: "Richiesta non valida.",
  site_not_allowed: "Origine non autorizzata.",
  save_failed: "Invio non riuscito. Chiamaci al 331 733 8620.",
  database_unavailable: "Servizio momentaneamente non disponibile. Chiamaci al 331 733 8620.",
};

function plainObject(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
function bool(v) { return v === true || v === "true" || v === 1; }
function splitName(full, isCompany) {
  const parts = full.split(/\s+/).filter(Boolean);
  if (isCompany || parts.length < 2) return { firstName: "", lastName: full.slice(0, 60) };
  return { firstName: parts.slice(0, -1).join(" ").slice(0, 60), lastName: parts[parts.length - 1].slice(0, 60) };
}
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

export async function handlePulizie(context, kind) {
  const { request, env, waitUntil } = context;
  if (!identifySite(request)) return json({ ok: false, error: MESSAGES.site_not_allowed }, 403);
  const { body, error } = await readJson(request.clone());
  if (error) return json({ ok: false, error: MESSAGES[error] || error }, error === "payload_too_large" ? 413 : 400);

  // Honeypot / too-fast bots: pretend success, store nothing.
  if (cleanText(body.hp, 200) || cleanText(body.website, 200)) return json({ ok: true, id: crypto.randomUUID(), type: "lead" });

  const q = plainObject(body.quote);
  const quote = {
    piani: num(q.piani), appartamenti: num(q.appartamenti), ascensore: bool(q.ascensore), areaEsterna: bool(q.areaEsterna),
    garage: bool(q.garage), piuScale: bool(q.piuScale), frequenza: cleanText(q.frequenza, 30) || null,
    stimaMensileEur: num(q.stimaMensileEur), quotaAppartamentoEur: num(q.quotaAppartamentoEur), riepilogo: cleanText(q.riepilogo, 300) || null,
  };
  const isPartner = kind === "partner";
  const city = cleanText(body.citta || body.city, 120);
  const street = cleanText(body.via, 200);
  const address = cleanText(body.indirizzo, 300) || [street, city].filter(Boolean).join(", ");
  const attr = plainObject(body.attribution);
  const utm = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "gclid", "fbclid"]) if (attr[k]) utm[k] = cleanText(attr[k], 200);

  const answers = {
    siteTag: SITE_TAG,
    source: cleanText(body.source, 40) || (isPartner ? "partner" : "calculator"),
    ruolo: isPartner ? undefined : (cleanText(body.ruolo, 40) || null),
    mode: cleanText(body.mode, 40) || null,
    partner: isPartner,
    tipo: isPartner ? cleanText(body.tipo, 40) || null : undefined,
    city: city || null,
    street: street || null,
    address: address || null,
    quote: isPartner ? undefined : quote,
    device: cleanText(body.device, 20) || null,
    landing_url: cleanText(attr.landing_url, 500) || null,
    fill_ms: num(body.t),
  };
  const normalized = {
    nome: cleanText(body.nome, 120),
    contact: { fullName: cleanText(body.nome, 120), ...splitName(cleanText(body.nome, 120), isPartner), phone: cleanText(body.telefono, 40), email: cleanText(body.email, 254) },
    email: cleanText(body.email, 254),
    privacyAccepted: bool(body.privacy),
    consents: { privacy: bool(body.privacy), timestamp: new Date().toISOString() },
    answers,
    estimate: isPartner ? {} : { low: quote.stimaMensileEur, high: quote.stimaMensileEur, intervention: "pulizie_condominiali", currency: "EUR", period: "month" },
    utm,
    variant: isPartner ? "pcv-partner" : SITE_TAG,
    page: "/",
    referrer: cleanText(attr.referrer, 500),
  };
  const forward = new Request(request.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(normalized) });
  const res = await capture(forward, env, "lead", { waitUntil });
  if (res.status === 200) return res;
  const data = await res.json().catch(() => ({}));
  return json({ ok: false, error: MESSAGES[data.error] || "Invio non riuscito. Chiamaci al 331 733 8620.", code: data.error || "error" }, res.status);
}
