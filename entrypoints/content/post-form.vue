<template>
    <div class="post-form">
        <inputField
            label="Текст поста"
            id="album-text"
            type="textarea"
            v-model="postContent"
        ></inputField>

        <div class="date-picker-section" v-if="!hideDatePicker">
            <label>
                <input type="checkbox" v-model="includePublishDate" />
                Включить дату
            </label>
            <VueDatePicker
                v-if="includePublishDate"
                v-model="publishDate"
                locale="ru"
                cancelText="Отмена"
                selectText="Выбрать"
                :dark="true"
                class="date-picker"
                :minDate="new Date()"
            />
            <div
                v-if="postStore.isEditing && !includePublishDate"
                class="warning"
            >
                Предупреждение: Если снять галочку, отложенная запись будет
                опубликована немедленно.
            </div>
        </div>
        <inputField
            label="Ссылка на альбом"
            id="album_link"
            v-model="albumLink"
            :error="!!albumLink.length && !isAlbumLinkValid"
        >
            <template #icon>
                <loading v-if="isLoadingAlbum" />
                <success v-if="isAlbumValid" />
                <error
                    v-if="
                        !isAlbumValid && !isLoadingAlbum && !!albumLink.length
                    "
                />
            </template>
        </inputField>
        <div v-if="albumList.length" class="albums-list">
            <div v-for="album in albumList" :key="album.id" class="album-item">
                {{ album.title }}
                <div class="album-actions">
                    <a
                        :href="`https://vk.com/${album.id}`"
                        target="_blank"
                        class="open-album-button"
                    >
                        Открыть
                    </a>
                    <button
                        @click="removeAlbumFromList(album.id)"
                        class="remove-button"
                    >
                        <error />
                    </button>
                </div>
            </div>
        </div>
        <button
            @click="submitPost"
            class="send-button"
            :class="{ active: isSubmitButtonActive }"
            :disabled="!isSubmitButtonActive"
        >
            {{ postStore.isEditing ? "Сохранить изменения" : "Отправить пост" }}
        </button>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import inputField from "./input-field.vue";
import loading from "./icones/loading.vue";
import success from "./icones/success.vue";
import error from "./icones/error.vue";
import VueDatePicker from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";
import { retrieveAccessToken } from "@/utilities/AccessToken";
import { usePostStore } from "@/stores/postStore";

const albumLink = ref("");
const isLoadingAlbum = ref(false);
const albumId = ref("");
const ownerId = ref("");
const accessToken = ref("");
const isAlbumValid = ref(null);
const albumList = ref([]);
const postContent = ref("");
const includePublishDate = ref(false);
const publishDate = ref(null);
const groupId = ref(null);
const hideDatePicker = ref(false);

const postStore = usePostStore();

watch(
    () => postStore.postInfo,
    (value) => {
        if (value) {
            postContent.value = value.text;
            includePublishDate.value = !!value.date;
            publishDate.value = value?.date || null;
            if (publishDate.value && publishDate.value < new Date()) {
                hideDatePicker.value = true;
            } else {
                hideDatePicker.value = false;
            }
            albumList.value = value.albums;
        }
    },
    { immediate: true }
);

const isSubmitButtonActive = computed(() => {
    if (postStore.isEditing) {
        return (
            postContent.value !== postStore.postInfo.text ||
            publishDate.value !== postStore.postInfo.date ||
            JSON.stringify(albumList.value) !==
                JSON.stringify(postStore.postInfo.albums) ||
            includePublishDate.value !== !!postStore.postInfo.date
        );
    }
    return (
        (!includePublishDate.value || publishDate.value) &&
        albumList.value.length > 0
    );
});

const isAlbumLinkValid = computed(() => {
    const regex = /^https:\/\/vk\.com\/album-(\d+)_(\d+)$/;
    const match = albumLink.value.match(regex);
    if (match) {
        ownerId.value = match[1];
        albumId.value = match[2];
        return true;
    }
    return false;
});

const debounce = (func, delay) => {
    let debounceTimer;
    return (...args) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
};

const checkAlbumExistence = async (albumId, ownerId) => {
    isLoadingAlbum.value = true;
    isAlbumValid.value = null; // Reset the album existence status
    try {
        const response = await fetch(
            `https://api.vk.com/method/photos.getAlbums?owner_id=-${ownerId}&album_ids=${albumId}&access_token=${accessToken.value}&v=5.199&count=1`
        );
        const data = await response.json();

        if (
            data.response &&
            data.response.items.length > 0 &&
            data.response.items[0].owner_id == ownerId * -1 &&
            data.response.items[0].id == albumId
        ) {
            isAlbumValid.value = true;
            const albumTitle = data.response.items[0].title;
            const fullAlbumId = `album-${ownerId}_${albumId}`;
            const albumAlreadyExists = albumList.value.some(
                (album) => album.id === fullAlbumId
            );
            if (!albumAlreadyExists) {
                albumList.value.push({ id: fullAlbumId, title: albumTitle });
            }
            albumLink.value = ""; // Clear the link input field
            return true;
        } else {
            isAlbumValid.value = false;
            return false;
        }
    } catch (error) {
        console.error("Error checking album existence:", error);
        isAlbumValid.value = false;
        return false;
    } finally {
        isLoadingAlbum.value = false;
    }
};

const debouncedCheckAlbumExistence = debounce(checkAlbumExistence, 500);

const removeAlbumFromList = (albumId) => {
    albumList.value = albumList.value.filter((album) => album.id !== albumId);
};

const submitPost = async () => {
    if (!isSubmitButtonActive.value) return;
    try {
        const publishTimestamp = includePublishDate.value
            ? Math.floor(new Date(publishDate.value).getTime() / 1000)
            : null;
        const attachments = albumList.value.map((album) => album.id).join(",");

        const params = {
            owner_id: -groupId.value,
            from_group: 1,
            message: postContent.value,
            attachments: attachments,
            access_token: accessToken.value,
            v: "5.199",
        };

        if (postStore.isEditing) {
            params.post_id = postStore.postInfo.id;
            if (includePublishDate.value) {
                params.publish_date = publishTimestamp;
            }
            const response = await fetch(
                `https://api.vk.com/method/wall.edit`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: new URLSearchParams(params),
                }
            );

            const data = await response.json();
            if (data.response && data.response.post_id) {
                console.log("Post successfully edited.");
                // Close the modal and reload the page
                window.location.reload();
            } else {
                console.error("Error editing post:", data);
            }
        } else {
            if (!hideDatePicker.value && publishTimestamp) {
                params.publish_date = publishTimestamp;
            }
            const response = await fetch(
                `https://api.vk.com/method/wall.post`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: new URLSearchParams(params),
                }
            );

            const data = await response.json();
            if (data.response && data.response.post_id) {
                console.log(
                    `Post successfully created. Post ID: ${data.response.post_id}`
                );
                // Close the modal and reload the page
                window.location.reload();
            } else {
                console.error("Error creating post:", data);
            }
        }
    } catch (error) {
        console.error("VK API error:", error);
    }
};

const getGroupIdFromUrl = async () => {
    const urlParts = window.location.pathname.split("/");
    const groupScreenName = urlParts[urlParts.length - 1];
    if (groupScreenName) {
        // Check if the screen name is in the standard format "club<id>"
        const regex = /^club(\d+)$/;
        const match = groupScreenName.match(regex);
        if (match) {
            groupId.value = parseInt(match[1], 10);
        } else {
            // If not, resolve the group ID using the VK API
            try {
                const response = await fetch(
                    `https://api.vk.com/method/groups.getById?group_ids=${groupScreenName}&access_token=${accessToken.value}&v=5.199`
                );
                const data = await response.json();
                if (data.response && data.response.length > 0) {
                    groupId.value = data.response[0].id;
                } else {
                    console.error("Group not found:", groupScreenName);
                }
            } catch (error) {
                console.error("Error fetching group ID:", error);
            }
        }
    }
};

watch(albumLink, async (newLink) => {
    if (isAlbumLinkValid.value) {
        await debouncedCheckAlbumExistence(albumId.value, ownerId.value);
    } else {
        isAlbumValid.value = null; // Reset the album existence status when the link is invalid
    }
});

onMounted(() => {
    accessToken.value = retrieveAccessToken();
    getGroupIdFromUrl();
});
</script>

<style lang="scss" scoped>
.post-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.date-picker-section {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    --dp-border-radius: 8px;
}
.albums-list {
    margin-top: 16px;
}
.album-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    background-color: var(--vkui--color_background_content);
    border-radius: 8px;
    margin-bottom: 8px;
}
.album-actions {
    display: flex;
    gap: 8px;
    align-items: center;

    .open-album-button {
        background-color: transparent;
        border: none;
        color: var(--vkui--color_accent);
        text-decoration: none;
        cursor: pointer;
        font-size: 14px;

        &:hover {
            text-decoration: underline;
        }
    }

    .remove-button {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
}
.send-button {
    margin-top: 16px;
    padding: 10px 20px;
    background-color: gray;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    &.active {
        background-color: white;
        color: black;
    }
    &:disabled {
        background-color: gray;
        color: white;
        cursor: not-allowed;
    }
}
.warning {
    color: red;
    font-size: 12px;
    margin-top: 8px;
}
</style>
