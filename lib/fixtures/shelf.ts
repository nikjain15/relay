import type { Product } from "@/lib/types";
import { SHELF_DATA } from "@/lib/data";

// The approved shelf, from data/shelf.json. Relay never free-generates a product.
export const SHELF: Product[] = SHELF_DATA;

export function product(id: string): Product | undefined {
  return SHELF.find((p) => p.id === id);
}
