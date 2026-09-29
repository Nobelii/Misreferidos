"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Plus, X, Eye, AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BenefitCard } from "@/components/benefit-card";
import { BrandCombobox } from "@/components/brand-combobox";
import { BENEFIT_TYPE_META, BENEFIT_TYPE_ORDER } from "@/lib/benefit-format";
import { publishReferral } from "@/lib/actions";
import type { Benefit, Brand, BenefitType, Category } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FormState {
  brand: string;
  brandId: string;
  type: BenefitType;
  value: string;
  headline: string;
  code: string;
  redeemUrl: string;
  categorySlug: string;
  description: string;
  conditions: string[];
  expiresAt: string;
}

type Errors = Partial<Record<keyof FormState | "access" | "form", string>>;

// Las reglas de aquí son las mismas que los CHECK de la tabla `referrals`
// (code_or_url, value_required, redeem_url_fmt). Se validan en el cliente para
// dar feedback inmediato, pero la base es la que manda: si algo se cuela, el
// insert falla y publishReferral() traduce el error.
function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.brandId) errors.brand = "Elige una marca de la lista o añádela.";
  if (!form.headline.trim())
    errors.headline = "Explica en una línea qué obtiene la persona.";
  else if (form.headline.trim().length < 5)
    errors.headline = "Un poco más de detalle: mínimo 5 caracteres.";

  const needsValue = BENEFIT_TYPE_META[form.type].unit !== "";
  if (needsValue && !form.value.trim())
    errors.value = "Indica cuánto es el beneficio.";
  else if (needsValue && Number(form.value) <= 0)
    errors.value = "Tiene que ser un número mayor que cero.";

  // Un beneficio sin código ni enlace no se puede usar: es el mínimo que lo
  // hace útil para la comunidad.
  if (!form.code.trim() && !form.redeemUrl.trim())
    errors.access =
      "Necesitamos al menos un código o un enlace para poder usarlo.";

  if (form.redeemUrl.trim() && !/^https?:\/\/.+\..+/.test(form.redeemUrl.trim()))
    errors.redeemUrl = "El enlace debe empezar por http:// o https://";

  return errors;
}

export function PublicarForm({ categories }: { categories: Category[] }) {
  const initial: FormState = useMemo(
    () => ({
      brand: "",
      brandId: "",
      type: "discount",
      value: "",
      headline: "",
      code: "",
      redeemUrl: "",
      categorySlug: categories[0]?.slug ?? "",
      description: "",
      conditions: [""],
      expiresAt: "",
    }),
    [categories],
  );

  const [form, setForm] = useState<FormState>(initial);
  // La marca seleccionada se guarda entera (con logo) para el chip del combobox
  // y la vista previa; en el form solo viajan su id y su nombre.
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    // El error desaparece en cuanto la persona corrige, no al reenviar.
    setErrors((e) => ({ ...e, [key]: undefined, access: undefined, form: undefined }));
  }

  function handleBrandChange(brand: Brand | null) {
    setSelectedBrand(brand);
    setForm((f) => ({ ...f, brand: brand?.name ?? "", brandId: brand?.id ?? "" }));
    setErrors((e) => ({ ...e, brand: undefined, form: undefined }));
  }

  const categoryName =
    categories.find((c) => c.slug === form.categorySlug)?.name ?? "";

  // El preview usa la BenefitCard real, así que lo que ves aquí es exactamente
  // lo que verá la comunidad en Explorar.
  const preview: Benefit = useMemo(
    () => ({
      id: "preview",
      brand: form.brand.trim() || "Tu marca",
      // El preview no navega a ninguna parte, pero BenefitCard construye el
      // href con esto. El slug real lo pone el trigger set_referral_slugs().
      brandSlug: selectedBrand?.slug ?? "",
      logoUrl: selectedBrand?.logoUrl,
      headline: form.headline.trim() || "Describe el beneficio en una línea",
      category: categoryName,
      type: form.type,
      value: form.value,
      code: form.code.trim() || undefined,
      ctaLabel: form.code.trim() ? "Copiar Código" : "Obtener Código",
      uses: 0,
      views: 0,
      savedCount: 0,
      helpfulCount: 0,
      verified: false,
      expiresAt: form.expiresAt || undefined,
    }),
    [form, categoryName, selectedBrand],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document
        .querySelector("[data-error='true']")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    startTransition(async () => {
      const result = await publishReferral({
        brand: form.brand,
        brandId: form.brandId,
        benefitType: form.type,
        value: form.value,
        title: form.headline,
        code: form.code,
        redeemUrl: form.redeemUrl,
        categorySlug: form.categorySlug,
        description: form.description,
        conditions: form.conditions,
        expiresAt: form.expiresAt,
      });

      if (result.ok) setSubmitted(true);
      else setErrors({ form: result.error });
    });
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card className="flex flex-col items-center gap-4 p-10 text-center bg-white/70 border-slate-200/70">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              ¡Gracias por compartir!
            </h1>
            <p className="text-muted-foreground mt-2">
              Tu beneficio ya está publicado en Explorar. Puedes editarlo o
              pausarlo cuando quieras desde tu panel.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Link href="/app/dashboard">
              <Button>Ir a mi panel</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setForm(initial);
                setSelectedBrand(null);
                setErrors({});
                setSubmitted(false);
              }}
            >
              Publicar otro
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Comparte un beneficio
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Un descuento, meses gratis, un envío gratis o un código que te
          funcionó. Si le sirve a alguien más, vale la pena publicarlo.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start"
      >
        <div className="space-y-6">
          <Section
            step={1}
            title="Qué compartes"
            hint="Esto es lo primero que ve la gente."
          >
            <Field
              label="Marca o servicio"
              required
              error={errors.brand}
              hint="Busca la marca; si no está, añádela con su logo."
            >
              <BrandCombobox
                value={selectedBrand}
                onChange={handleBrandChange}
                categories={categories}
                error={errors.brand}
              />
            </Field>

            <Field label="Tipo de beneficio" required>
              <div className="flex flex-wrap gap-2">
                {BENEFIT_TYPE_ORDER.map((t) => {
                  const meta = BENEFIT_TYPE_META[t];
                  const Icon = meta.icon;
                  const active = form.type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("type", t)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900",
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {BENEFIT_TYPE_META[form.type].unit !== "" && (
              <Field
                label="Valor del beneficio"
                required
                error={errors.value}
                htmlFor="value"
              >
                <div className="relative max-w-[220px]">
                  <Input
                    id="value"
                    type="number"
                    min="1"
                    value={form.value}
                    onChange={(e) => set("value", e.target.value)}
                    placeholder="20"
                    className="pr-20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
                    {BENEFIT_TYPE_META[form.type].unit}
                  </span>
                </div>
              </Field>
            )}

            <Field
              label="Descripción corta"
              required
              error={errors.headline}
              htmlFor="headline"
              hint="Una línea. Aparece bajo el beneficio en la tarjeta."
            >
              <Input
                id="headline"
                value={form.headline}
                onChange={(e) => set("headline", e.target.value)}
                placeholder="En tu primer pedido a domicilio"
                maxLength={120}
              />
            </Field>
          </Section>

          <Section
            step={2}
            title="Cómo se usa"
            hint="Cuanto más claro, más confianza genera."
          >
            {errors.access && (
              <div
                data-error="true"
                className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errors.access}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Código" htmlFor="code">
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                  placeholder="RAPPI20"
                  maxLength={40}
                  className="font-mono"
                />
              </Field>
              <Field label="Enlace" error={errors.redeemUrl} htmlFor="url">
                <Input
                  id="url"
                  type="url"
                  value={form.redeemUrl}
                  onChange={(e) => set("redeemUrl", e.target.value)}
                  placeholder="https://…"
                />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Categoría" required htmlFor="category">
                <select
                  id="category"
                  value={form.categorySlug}
                  onChange={(e) => set("categorySlug", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Vence el"
                htmlFor="expires"
                hint="Opcional. Déjalo vacío si no caduca."
              >
                <Input
                  id="expires"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => set("expiresAt", e.target.value)}
                />
              </Field>
            </div>

            <Field
              label="Detalles"
              htmlFor="description"
              hint="Cuenta cómo lo usaste y qué incluye."
            >
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Lo usé al crear mi cuenta y el descuento se aplicó al pagar…"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
            </Field>

            <Field
              label="Condiciones"
              hint="Lo que hay que cumplir para que funcione."
            >
              <div className="space-y-2">
                {form.conditions.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={c}
                      onChange={(e) => {
                        const next = [...form.conditions];
                        next[i] = e.target.value;
                        set("conditions", next);
                      }}
                      placeholder="Solo para cuentas nuevas"
                    />
                    {form.conditions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-slate-400 hover:text-rose-600"
                        aria-label={`Quitar condición ${i + 1}`}
                        onClick={() =>
                          set(
                            "conditions",
                            form.conditions.filter((_, j) => j !== i),
                          )
                        }
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => set("conditions", [...form.conditions, ""])}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Añadir condición
                </Button>
              </div>
            </Field>
          </Section>

          {errors.form && (
            <div
              data-error="true"
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errors.form}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" disabled={pending}>
              {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {pending ? "Publicando…" : "Publicar beneficio"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Se publica al instante. Podrás editarlo o pausarlo cuando quieras.
            </p>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 space-y-3">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
            <Eye className="w-3.5 h-3.5" />
            Así se verá
          </h4>
          <div className="pointer-events-none">
            <BenefitCard benefit={preview} />
          </div>
          <p className="text-xs text-muted-foreground">
            Vista previa en vivo de tu tarjeta en Explorar.
          </p>
        </aside>
      </form>
    </div>
  );
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6 bg-white/70 border-slate-200/70 space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
          {step}
        </span>
        <div>
          <h2 className="font-semibold text-slate-900 leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </Card>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5" data-error={error ? "true" : undefined}>
      <Label htmlFor={htmlFor} className="text-sm">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1 text-xs text-rose-600">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
