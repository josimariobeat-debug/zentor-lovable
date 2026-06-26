/**
 * Shim para compatibilidade com import "@/components/ui/toaster".
 * Re-exporta toast/Toaster do sonner para que o código importado do Zentor
 * original (toast.success/error/info) funcione sem alterações.
 */
import { Toaster as Sonner, toast as sonnerToast } from 'sonner';
export const Toaster = Sonner;
export const toast = sonnerToast;
export default Toaster;
