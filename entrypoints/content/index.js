import App from "./App.vue";
import { createApp } from "vue";
import "./reset.css";
export default defineContentScript({
    matches: ["*://vk.com/*"],
    cssInjectionMode: "ui",

    async main(ctx) {
        const postButton = document.getElementById("page_block_submit_post");
        if (postButton) {
            const ui = await defineOverlay(ctx, postButton);

            // Mount initially
            ui.mount();

            // Re-mount when page changes
            ctx.addEventListener(window, "wxt:locationchange", (event) => {
                ui.mount();
            });
        }
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
