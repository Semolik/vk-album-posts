import App from "./App.vue";
import { createApp } from "vue";
import { createPinia } from "pinia";
import { usePostStore } from "@/stores/postStore";
import Toast from "vue-toastification";
import "./reset.css";
import "vue-toastification/dist/index.css";

export default defineContentScript({
    matches: ["*://vk.com/*"],
    cssInjectionMode: "ui",

    async main(ctx) {
        let abortController = new AbortController();
        const findPostButton = async (
            retries = 15,
            interval = 1000,
            signal
        ) => {
            for (let attempt = 0; attempt < retries; attempt++) {
                if (signal.aborted) {
                    return null;
                }
                const postButton = document.getElementById(
                    "page_block_submit_post"
                );
                console.log(postButton);
                if (postButton) {
                    return postButton;
                }
                try {
                    await new Promise((resolve, reject) => {
                        const timeoutId = setTimeout(resolve, interval);
                        signal.addEventListener(
                            "abort",
                            () => {
                                clearTimeout(timeoutId);
                                reject(new Error("Aborted"));
                            },
                            { once: true }
                        );
                    });
                } catch (error) {
                    if (error.message === "Aborted") {
                        return null;
                    }
                    throw error;
                }
            }
            return null;
        };

        const mountUI = async () => {
            const postButton = await findPostButton(
                undefined,
                undefined,
                abortController.signal
            );
            if (postButton) {
                if (postButton.querySelector("vk-album-posts")) return;
                const ui = await defineOverlay(ctx, postButton);

                ui.mount();

                const observer = new MutationObserver(() => {
                    addEditButtonToHeaders();
                });
                const postsContainer = document.querySelector("#content");
                if (postsContainer) {
                    observer.observe(postsContainer, {
                        childList: true,
                        subtree: true,
                    });
                }
            }
        };

        // Первоначальный монтаж
        await mountUI();

        // Перемонтировка при изменении пути
        ctx.addEventListener(window, "wxt:locationchange", async () => {
            abortController.abort(); // Отменяем текущий поиск
            abortController = new AbortController(); // Создаем новый контроллер для следующего поиска
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
            const pinia = createPinia();
            const app = createApp(App);
            app.use(pinia);
            app.use(Toast, { container: container });
            app.mount(container);
            return app;
        },
        onRemove(app) {
            app?.unmount();
        },
    });
}

function addEditButtonToHeaders() {
    const posts = document.querySelectorAll("._post");
    posts.forEach((post) => {
        const header = post.querySelector(".PostHeader");
        if (!header) return;
        const menuButtonContainer = header.querySelector(
            ".PostContextMenuReact__root"
        );
        const links = post.querySelectorAll(".PostContentContainer__root a");
        const hasAlbumLink = Array.from(links).some((link) =>
            link.href.includes("/album-")
        );

        if (
            menuButtonContainer &&
            !header.querySelector(".edit-button") &&
            hasAlbumLink
        ) {
            const button = document.createElement("button");
            button.textContent = "Редактировать";
            button.className =
                "vkuiIconButton vkuiIconButton--sizeY-compact vkuiTappable vkuiTappable--hasPointer-none vkuiClickable__resetButtonStyle vkuiClickable__host vkuiClickable__realClickable vkui-focus-visible vkuiRootComponent edit-button";
            button.type = "button";
            button.setAttribute("aria-expanded", "false");

            menuButtonContainer.insertAdjacentElement("beforebegin", button);

            button.addEventListener("click", async () => {
                const postStore = usePostStore();
                const postId = post.getAttribute("data-post-id");
                postStore.showEditModal(postId);
            });
        }
    });
}
