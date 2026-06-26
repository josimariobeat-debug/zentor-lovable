// Mocked data for Zentor clone
export const currentUser = {
  name: "Josimário",
  initials: "JO",
  email: "contato@zentor.com",
  plan: "Pro",
};

export interface InstalledApp {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  expiresInDays: number;
}

export const installedApps: InstalledApp[] = [
  {
    id: "stories-videos",
    name: "Stories Vídeos",
    type: "SCRIPT EXTERNO",
    description: "Crie e gerencie stories e vídeos com player flutuante e carrossel na sua loja.",
    status: "ativa",
    expiresInDays: 9,
  },
  {
    id: "whatsapp-button",
    name: "WhatsApp Button",
    type: "SCRIPT EXTERNO",
    description: "Botão flutuante de WhatsApp com mensagens personalizadas por página.",
    status: "ativa",
    expiresInDays: 9,
  },
];

export interface StoreApp {
  id: string;
  name: string;
  type: string;
  description: string;
  price: string;
  installed: boolean;
}

export const storeApps: StoreApp[] = [
  {
    id: "stories-videos",
    name: "Stories Vídeos",
    type: "SCRIPT EXTERNO",
    description: "Crie e gerencie stories e vídeos com player flutuante e carrossel na sua loja.",
    price: "R$ 29,90/mês",
    installed: true,
  },
  {
    id: "avaliacoes-pro",
    name: "Avaliações Pro",
    type: "SCRIPT EXTERNO",
    description: "Colete e exiba avaliações verificadas dos seus clientes com fotos e vídeos.",
    price: "R$ 19,90/mês",
    installed: false,
  },
  {
    id: "popup-conversao",
    name: "Pop-up de Conversão",
    type: "SCRIPT EXTERNO",
    description: "Pop-ups inteligentes baseados em comportamento para aumentar conversão.",
    price: "R$ 14,90/mês",
    installed: false,
  },
  {
    id: "whatsapp-button",
    name: "WhatsApp Button",
    type: "SCRIPT EXTERNO",
    description: "Botão flutuante de WhatsApp com mensagens personalizadas por página.",
    price: "Grátis",
    installed: true,
  },
];

export interface Tutorial {
  id: number;
  title: string;
  duration: string;
  category: string;
}

export const tutorials: Tutorial[] = [
  { id: 1, title: "Como instalar um app na sua loja", duration: "3 min", category: "Começando" },
  { id: 2, title: "Configurando Stories Vídeos pela primeira vez", duration: "6 min", category: "Stories Vídeos" },
  { id: 3, title: "Upload de mídias pelo celular via QR Code", duration: "4 min", category: "Stories Vídeos" },
  { id: 4, title: "Como gerenciar sua assinatura", duration: "2 min", category: "Conta" },
  { id: 5, title: "Personalizando a aparência do widget", duration: "5 min", category: "Stories Vídeos" },
  { id: 6, title: "Integrando com sua plataforma de e-commerce", duration: "7 min", category: "Integrações" },
];

export interface Subscription {
  id: string;
  app: string;
  plan: string;
  price: string;
  nextBilling: string;
  status: string;
}

export const subscriptions: Subscription[] = [
  {
    id: "sub-1",
    app: "Stories Vídeos",
    plan: "Mensal",
    price: "R$ 29,90",
    nextBilling: "18/07/2025",
    status: "ativa",
  },
];

export interface Story {
  id: string;
  title: string;
  thumbnail: string;
  coverUrl?: string;
  coverType?: string;
  format: string;
  active: boolean;
  views: number;
}

export const sampleStories: Story[] = [
  {
    id: "s1",
    title: "Coleção Verão 2025",
    thumbnail: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&h=400&fit=crop",
    format: "video",
    active: true,
    views: 1284,
  },
  {
    id: "s2",
    title: "Promoção relâmpago",
    thumbnail: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&h=400&fit=crop",
    format: "video",
    active: true,
    views: 932,
  },
  {
    id: "s3",
    title: "Lookbook outono",
    thumbnail: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=300&h=400&fit=crop",
    format: "image",
    active: false,
    views: 421,
  },
];
