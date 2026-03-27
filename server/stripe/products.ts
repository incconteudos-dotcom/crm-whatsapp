/**
 * Catálogo de produtos do Estúdio de Podcast
 * Estes produtos são usados para criar Checkout Sessions no Stripe.
 * Preços em centavos (BRL).
 */

export interface StudioProduct {
  id: string;
  name: string;
  description: string;
  unitAmount: number; // centavos BRL
  currency: string;
  category: "episode" | "package" | "studio" | "service";
}

export const STUDIO_PRODUCTS: StudioProduct[] = [
  {
    id: "ep_single",
    name: "1 Episódio de Podcast",
    description: "Gravação, edição e masterização de 1 episódio completo",
    unitAmount: 80000, // R$ 800,00
    currency: "brl",
    category: "episode",
  },
  {
    id: "ep_pack_4",
    name: "Pacote 4 Episódios",
    description: "Gravação, edição e masterização de 4 episódios — economia de 10%",
    unitAmount: 288000, // R$ 2.880,00
    currency: "brl",
    category: "package",
  },
  {
    id: "ep_pack_10",
    name: "Pacote 10 Episódios",
    description: "Gravação, edição e masterização de 10 episódios — economia de 20%",
    unitAmount: 640000, // R$ 6.400,00
    currency: "brl",
    category: "package",
  },
  {
    id: "studio_hour",
    name: "Locação de Estúdio (hora)",
    description: "Locação do estúdio por hora sem serviços de produção",
    unitAmount: 15000, // R$ 150,00
    currency: "brl",
    category: "studio",
  },
  {
    id: "mixing",
    name: "Mixagem de Episódio",
    description: "Serviço de mixagem profissional para episódio já gravado",
    unitAmount: 25000, // R$ 250,00
    currency: "brl",
    category: "service",
  },
  {
    id: "mastering",
    name: "Masterização de Episódio",
    description: "Masterização profissional para distribuição em plataformas",
    unitAmount: 15000, // R$ 150,00
    currency: "brl",
    category: "service",
  },
];

export function getProductById(id: string): StudioProduct | undefined {
  return STUDIO_PRODUCTS.find((p) => p.id === id);
}
