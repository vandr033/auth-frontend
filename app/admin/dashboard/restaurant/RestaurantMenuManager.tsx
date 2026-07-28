"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { notify } from "@/lib/notify";
import { getImageUrl } from "@/utils/image-url";
import {
  createRestaurantMenuCategory,
  createRestaurantMenuItem,
  deleteRestaurantMenuItem,
  deleteRestaurantMenuItemImage,
  getRestaurantAccess,
  listRestaurantMenuCategories,
  listRestaurantMenuItems,
  reorderRestaurantMenuCategories,
  reorderRestaurantMenuItems,
  type RestaurantAllergen,
  type RestaurantDietaryLabel,
  type RestaurantMenuCategory,
  type RestaurantMenuItem,
  updateRestaurantMenuItem,
  uploadRestaurantMenuItemImage,
} from "@/app/admin/lib/adminApi";

const dietary: Array<[RestaurantDietaryLabel, string]> = [
  ["VEGETARIAN", "Vegetariano"],
  ["VEGAN", "Vegano"],
  ["GLUTEN_FREE", "Sin gluten"],
  ["SPICY", "Picante"],
  ["DAIRY_FREE", "Sin lácteos"],
  ["NUT_FREE", "Sin frutos secos"],
];
const allergens: Array<[RestaurantAllergen, string]> = [
  ["GLUTEN", "Gluten"],
  ["DAIRY", "Lácteos"],
  ["EGGS", "Huevos"],
  ["PEANUTS", "Maní"],
  ["TREE_NUTS", "Frutos secos"],
  ["SOY", "Soya"],
  ["FISH", "Pescado"],
  ["SHELLFISH", "Mariscos"],
  ["SESAME", "Sésamo"],
];
const message = (error: unknown) =>
  error instanceof Error ? error.message : "No pudimos completar la operación.";
const emptyItem = {
  category_id: 0,
  name: "",
  description: "",
  price: "",
  is_active: true,
  is_available: true,
  is_featured: false,
  preparation_minutes: "",
  dietary_labels: [] as RestaurantDietaryLabel[],
  allergens: [] as RestaurantAllergen[],
};

function ToggleList<T extends string>({
  values,
  options,
  onChange,
}: {
  values: T[];
  options: Array<[T, string]>;
  onChange: (next: T[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {options.map(([key, label]) => (
        <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={values.includes(key)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...values, key]
                  : values.filter((value) => value !== key),
              )
            }
          />
          {label}
        </label>
      ))}
    </div>
  );
}

export function RestaurantMenuManager() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<RestaurantMenuCategory[]>([]);
  const [items, setItems] = useState<RestaurantMenuItem[]>([]);
  const [selected, setSelected] = useState<number | "all">("all");
  const [newCategory, setNewCategory] = useState("");
  const [draft, setDraft] = useState(emptyItem);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const access = await getRestaurantAccess();
      setEnabled(access.enabled);
      if (access.enabled) {
        const [nextCategories, result] = await Promise.all([
          listRestaurantMenuCategories(),
          listRestaurantMenuItems(),
        ]);
        setCategories(nextCategories);
        setItems(result.items);
      }
    } catch (error) {
      await notify.error(message(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visibleItems = useMemo(
    () =>
      selected === "all"
        ? items
        : items.filter((item) => item.category_id === selected),
    [items, selected],
  );

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await createRestaurantMenuCategory({
        name: newCategory.trim(),
        is_active: true,
        sort_order: categories.length,
      });
      setNewCategory("");
      await load();
    } catch (error) {
      await notify.error(message(error));
    }
  };

  const addItem = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createRestaurantMenuItem({
        ...draft,
        category_id: Number(draft.category_id),
        description: draft.description || null,
        price: draft.price.trim() || null,
        preparation_minutes:
          draft.preparation_minutes === "" ? null : Number(draft.preparation_minutes),
      });
      setDraft({ ...emptyItem, category_id: Number(draft.category_id) });
      await load();
    } catch (error) {
      await notify.error(message(error));
    } finally {
      setSaving(false);
    }
  };

  const mutateItem = async (
    item: RestaurantMenuItem,
    changes: Record<string, unknown>,
  ) => {
    try {
      const updated = await updateRestaurantMenuItem(item.id, changes);
      setItems((all) =>
        all.map((entry) =>
          entry.id === updated.id ? { ...entry, ...updated } : entry,
        ),
      );
    } catch (error) {
      await notify.error(message(error));
    }
  };

  const uploadItemImage = async (item: RestaurantMenuItem, file: File) => {
    try {
      await uploadRestaurantMenuItemImage(item.id, file);
      await load();
    } catch (error) {
      await notify.error(message(error));
    }
  };

  const moveItem = async (item: RestaurantMenuItem, direction: -1 | 1) => {
    const siblings = items
      .filter((entry) => entry.category_id === item.category_id)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const index = siblings.findIndex((entry) => entry.id === item.id);
    const target = siblings[index + direction];
    if (!target) return;
    try {
      await reorderRestaurantMenuItems([
        { id: item.id, sortOrder: target.sort_order },
        { id: target.id, sortOrder: item.sort_order },
      ]);
      await load();
    } catch (error) {
      await notify.error(message(error));
    }
  };

  const moveCategory = async (
    category: RestaurantMenuCategory,
    direction: -1 | 1,
  ) => {
    const index = categories.findIndex((entry) => entry.id === category.id);
    const target = categories[index + direction];
    if (!target) return;
    try {
      await reorderRestaurantMenuCategories([
        { id: category.id, sortOrder: target.sort_order },
        { id: target.id, sortOrder: category.sort_order },
      ]);
      await load();
    } catch (error) {
      await notify.error(message(error));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-admin-brand" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
        Habilitá Restaurant Lite en configuración para administrar el menú.
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-7 pb-10">
      <header>
        <p className="text-sm font-medium text-admin-brand">Restaurant Lite</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Menú digital
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Los productos inactivos se ocultan. Los no disponibles permanecen visibles
          con su estado. El menú se publica en la URL de tu tienda seguida de{" "}
          <code>/menu</code>.
        </p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Categorías</h2>
          <div className="mt-3 space-y-1">
            <button
              onClick={() => setSelected("all")}
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${selected === "all" ? "bg-admin-brand/10 font-semibold text-admin-brand" : "hover:bg-slate-50"}`}
            >
              Todos los productos{" "}
              <span className="float-right text-slate-500">{items.length}</span>
            </button>
            {categories.map((category, index) => (
              <div
                key={category.id}
                className="flex items-center gap-1 rounded-md hover:bg-slate-50"
              >
                <button
                  onClick={() => setSelected(category.id)}
                  className={`min-w-0 flex-1 truncate px-3 py-2 text-left text-sm ${selected === category.id ? "font-semibold text-admin-brand" : ""}`}
                >
                  {category.name}
                  <span className="float-right text-slate-500">
                    {items.filter((item) => item.category_id === category.id).length}
                  </span>
                </button>
                <button
                  aria-label="Subir categoría"
                  disabled={!index}
                  onClick={() => void moveCategory(category, -1)}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  aria-label="Bajar categoría"
                  disabled={index === categories.length - 1}
                  onClick={() => void moveCategory(category, 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="Nueva categoría"
              onKeyDown={(event) => event.key === "Enter" && void addCategory()}
            />
            <Button
              size="icon"
              onClick={() => void addCategory()}
              aria-label="Agregar categoría"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </aside>

        <div className="space-y-5">
          <form onSubmit={addItem} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-admin-brand" />
              <h2 className="font-semibold">Agregar producto</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                required
                value={draft.category_id}
                onChange={(event) =>
                  setDraft({ ...draft, category_id: Number(event.target.value) })
                }
                className="h-10 rounded-md border border-slate-200 px-3 text-sm"
              >
                <option value={0}>Categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Input
                required
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Nombre"
              />
              <Input
                inputMode="decimal"
                value={draft.price}
                onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                placeholder="Precio (opcional, ej. 56.00)"
              />
              <Input
                type="number"
                min={0}
                value={draft.preparation_minutes}
                onChange={(event) =>
                  setDraft({ ...draft, preparation_minutes: event.target.value })
                }
                placeholder="Minutos de preparación"
              />
              <textarea
                className="min-h-10 rounded-md border border-slate-200 p-2 text-sm md:col-span-2"
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
                placeholder="Descripción"
              />
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={draft.is_active}
                    onCheckedChange={(is_active) => setDraft({ ...draft, is_active })}
                  />
                  Activo
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={draft.is_available}
                    onCheckedChange={(is_available) =>
                      setDraft({ ...draft, is_available })
                    }
                  />
                  Disponible
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={draft.is_featured}
                    onCheckedChange={(is_featured) =>
                      setDraft({ ...draft, is_featured })
                    }
                  />
                  Destacado
                </label>
              </div>
              <Button disabled={saving || !categories.length}>
                {saving ? "Guardando…" : "Crear producto"}
              </Button>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                Etiquetas y alérgenos
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
                    Dietarias
                  </p>
                  <ToggleList
                    values={draft.dietary_labels}
                    options={dietary}
                    onChange={(dietary_labels) =>
                      setDraft({ ...draft, dietary_labels })
                    }
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
                    Alérgenos
                  </p>
                  <ToggleList
                    values={draft.allergens}
                    options={allergens}
                    onChange={(allergens) => setDraft({ ...draft, allergens })}
                  />
                </div>
              </div>
            </details>
          </form>

          <section className="space-y-3">
            {visibleItems.map((item) => (
              <article
                key={item.id}
                className={`grid gap-4 rounded-xl border bg-white p-4 sm:grid-cols-[84px_minmax(0,1fr)_auto] ${item.is_active ? "border-slate-200" : "border-slate-200 opacity-70"}`}
              >
                <label className="group block w-20 cursor-pointer">
                  <span className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-500 transition group-hover:ring-2 group-hover:ring-admin-brand/30">
                    {item.image_url ? (
                      <img
                        src={getImageUrl(item.image_url) || ""}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="h-5 w-5" />
                    )}
                  </span>
                  <span className="mt-1.5 flex items-center justify-center gap-1 whitespace-nowrap text-xs font-medium text-admin-brand group-hover:underline">
                    <ImagePlus className="h-3.5 w-3.5" />
                    {item.image_url ? "Cambiar imagen" : "Agregar imagen"}
                  </span>
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label={`${item.image_url ? "Cambiar" : "Agregar"} imagen de ${item.name}`}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadItemImage(item, file);
                    }}
                  />
                </label>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{item.name}</h3>
                    {item.is_featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                        <Star className="h-3 w-3 fill-current" />
                        Destacado
                      </span>
                    )}
                    {!item.is_available && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        No disponible
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.description || "Sin descripción"}
                  </p>
                  {item.price && (
                    <p className="mt-2 font-semibold text-slate-900">{item.price}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4 text-xs">
                    <label className="flex items-center gap-2">
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={(is_active) =>
                          void mutateItem(item, { is_active })
                        }
                      />
                      {item.is_active ? "Activo" : "Inactivo"}
                    </label>
                    <label className="flex items-center gap-2">
                      <Switch
                        checked={item.is_available}
                        onCheckedChange={(is_available) =>
                          void mutateItem(item, { is_available })
                        }
                      />
                      {item.is_available ? "Disponible" : "No disponible"}
                    </label>
                    <label className="flex items-center gap-2">
                      <Switch
                        checked={item.is_featured}
                        onCheckedChange={(is_featured) =>
                          void mutateItem(item, { is_featured })
                        }
                      />
                      Destacado
                    </label>
                    {item.image_url && (
                      <button
                        className="text-red-700 hover:underline"
                        onClick={async () => {
                          try {
                            await deleteRestaurantMenuItemImage(item.id);
                            await load();
                          } catch (error) {
                            await notify.error(message(error));
                          }
                        }}
                      >
                        Quitar imagen
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 self-start">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Subir"
                    onClick={() => void moveItem(item, -1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Bajar"
                    onClick={() => void moveItem(item, 1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Desactivar"
                    onClick={async () => {
                      try {
                        await deleteRestaurantMenuItem(item.id);
                        await load();
                      } catch (error) {
                        await notify.error(message(error));
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))}
            {!visibleItems.length && (
              <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Todavía no hay productos en esta vista.
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
