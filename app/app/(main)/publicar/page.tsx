import { PublicarForm } from "@/components/publicar-form";
import { getCategories } from "@/lib/queries";

export default async function PublicarPage() {
  const categories = await getCategories();
  return <PublicarForm categories={categories} />;
}
