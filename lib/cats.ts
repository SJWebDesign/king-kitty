export const CATS = [
  { id: "tuxedo", name: "Tuxedo", asset: "/assets/kitty-tuxedo.png" },
  { id: "ginger", name: "Ginger", asset: "/assets/kitty-sheet.png" },
  { id: "silver", name: "Silver tabby", asset: "/assets/kitty-silver.png" },
  { id: "calico", name: "Calico", asset: "/assets/kitty-calico.png" },
] as const;
export type CatSkin = typeof CATS[number]["id"];
export function validCat(value: unknown): CatSkin {
  return CATS.some(cat=>cat.id===value) ? value as CatSkin : "ginger";
}
export function catAsset(value: unknown) {
  return CATS.find(cat=>cat.id===validCat(value))!.asset;
}
