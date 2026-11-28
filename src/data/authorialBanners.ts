export interface AuthorialBannerConfig {
  id: string;
  desktopImage: string;
  mobileImage?: string;
  alt: string;
  href?: string;
  aspectClassName?: string;
}

/**
 * Registro central de banners autorais da Limiar.
 * Mantenha vazio até que imagens finais oficiais sejam inseridas na pasta public/assets/banners/.
 * Nenhum banner fictício ou placeholder vazio é renderizado quando não há ativo real cadastrado.
 */
export const AUTHORIAL_BANNERS: AuthorialBannerConfig[] = [];
