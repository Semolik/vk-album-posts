import App from "./App.vue";
import { createApp } from "vue";
import "./reset.css";
import { createPinia } from "pinia";
import { usePostStore } from "@/stores/postStore";
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
                const observer = new MutationObserver(() => {
                    addEditButtonToHeaders();
                });

                // Отслеживаем изменения в основном контейнере постов
                const postsContainer = document.querySelector("#content"); // Замените #content на ваш селектор
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
            app.mount(container);
            return app;
        },
        onRemove(app) {
            app?.unmount();
        },
    });
}
function addEditButtonToHeaders() {
    // Выбираем все элементы с классом заголовка поста
    // const headers = document.querySelectorAll(".PostHeaderActions--inPost");

    const posts = document.querySelectorAll("._post");
    posts.forEach((post) => {
        // Ищем контейнер для кнопок меню
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
            // Создаём кнопку
            const button = document.createElement("button");
            button.textContent = "Редактировать";
            button.className =
                "vkuiIconButton vkuiIconButton--sizeY-compact vkuiTappable vkuiTappable--hasPointer-none vkuiClickable__resetButtonStyle vkuiClickable__host vkuiClickable__realClickable vkui-focus-visible vkuiRootComponent edit-button";
            button.type = "button";
            button.setAttribute("aria-expanded", "false");

            // Вставляем кнопку перед кнопкой "Действия"
            menuButtonContainer.insertAdjacentElement("beforebegin", button);

            // Добавляем обработчик клика
            button.addEventListener("click", async () => {
                const postStore = usePostStore();
                const postId = post.getAttribute("data-post-id");
                postStore.showEditModal(postId);
            });
        }
    });
}
