// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages: https://zzmnxn.github.io/mybr-ai/
// 저장소 이름이나 도메인이 바뀌면 site와 base를 함께 고친다.
// 커스텀 도메인을 연결하면 site를 그 도메인으로, base는 지운다.
export default defineConfig({
  site: 'https://zzmnxn.github.io',
  base: '/mybr-ai',
  markdown: { shikiConfig: { themes: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' } } },
});
