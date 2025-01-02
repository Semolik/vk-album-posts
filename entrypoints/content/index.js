import App from "./App.vue";
import { createApp } from "vue";
import "./reset.css";

export default defineContentScript({
    matches: ["*://vk.com/*"],
    cssInjectionMode: "ui",

    async main(ctx) {
        // Функция для повторного поиска кнопки
        const findPostButton = async (retries = 15, interval = 1000) => {
            for (let attempt = 0; attempt < retries; attempt++) {
                const postButton = document.getElementById(
                    "page_block_submit_post"
                );
                if (postButton) {
                    return postButton;
                }
                await new Promise((resolve) => setTimeout(resolve, interval));
            }
            return null;
        };

        const mountUI = async () => {
            const postButton = await findPostButton();
            if (postButton) {
                const ui = await defineOverlay(ctx, postButton);
                ui.mount();
            }
        };

        // Первоначальный монтаж
        await mountUI();

        // Перемонтировка при изменении пути
        ctx.addEventListener(window, "wxt:locationchange", async () => {
            await mountUI();
        });
    },
});

function defineOverlay(ctx, postButton) {
    return createShadowRootUi(ctx, {
        name: "vk-album-posts",
        position: "inline",
        anchor: "#page_block_submit_post",
        onMount(container, _shadow, shadowHost) {
            postButton.style =
                "display: grid;grid-template-columns: 1fr min-content;gap: 8px; margin-top: 0; margin-bottom: -18px;";
            const app = createApp(App);
            app.mount(container);
            return app;
        },
        onRemove(app) {
            app?.unmount();
        },
    });
}
