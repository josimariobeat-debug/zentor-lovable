import { StoryViewer } from '@/pages/AppearanceEditor';

/**
 * Rota de teste (e2e) que monta o StoryViewer isolado, sem autenticação ou
 * dependências do editor. Usada pelo Playwright para validar o auto-advance
 * e o loop dos demo stories.
 */
export default function DevStoryViewer() {
  return (
    <div data-testid="dev-story-root" className="min-h-screen bg-black">
      <StoryViewer onClose={() => { /* noop em ambiente de teste */ }} />
    </div>
  );
}
