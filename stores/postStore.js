import { defineStore } from "pinia";
import { retrieveAccessToken } from "@/utilities/AccessToken";
import { watch } from "vue";
import { useToast } from "vue-toastification";

const toast = useToast();
export const usePostStore = defineStore("postStore", () => {
    const postInfo = ref(null);
    const isModalOpen = ref(false);
    const isEditing = ref(false);
    watch(isModalOpen, (value) => {
        if (!value) {
            postInfo.value = null;
            isEditing.value = false;
        }
    });
    const showEditModal = async (postId) => {
        const accessToken = retrieveAccessToken();
        try {
            const response = await fetch(
                `https://api.vk.com/method/wall.getById?posts=${postId}&extended=1&access_token=${accessToken}&v=5.131`
            );
            const data = await response.json();
            if (data?.error) {
                throw Error(JSON.stringify(data.error));
            }
            if (
                data.response &&
                data.response.items &&
                data.response.items.length > 0
            ) {
                const post = data.response.items[0];
                const albums = post.attachments
                    .filter((attachment) => attachment.type === "album")
                    .map((attachment) => ({
                        id: `album${attachment.album.owner_id}_${attachment.album.id}`,
                        title: attachment.album.title,
                    }));

                postInfo.value = {
                    id: post.id,
                    ownerId: post.owner_id,
                    albums: albums,
                    text: post.text,
                    date: new Date(post.date * 1000),
                };
                isEditing.value = true;
                isModalOpen.value = true;
            } else {
                throw Error(JSON.stringify(data));
            }
        } catch (error) {
            toast.error("Ошибка получения поста");
            console.error("Ошибка получения поста:", error);
        }
        const closeModal = () => {
            isModalOpen.value = false;
        };
        return { postInfo, isModalOpen, isEditing, showEditModal, closeModal };
    };
});
