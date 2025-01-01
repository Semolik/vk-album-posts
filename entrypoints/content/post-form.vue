<template>
    <div class="post-form">
        <inputField
            label="Ссылка на альбом"
            id="album_link"
            v-model="link"
            :error="link.length && !linkIsValid"
        >
            <template #icon>
                <loading v-if="loadingLink" />
                <success v-if="albumExists" />
                <error v-if="!albumExists && !loadingLink && link.length" />
            </template>
        </inputField>
        <inputField
            label="Текст поста"
            id="album-text"
            type="textarea"
            v-model="postText"
        ></inputField>
        <div class="date-picker-section">
            <label>
                <input type="checkbox" v-model="includeDate" />
                Включить дату
            </label>
            <VueDatePicker
                v-if="includeDate"
                v-model="date"
                locale="ru"
                cancelText="Отмена"
                selectText="Выбрать"
                :dark="true"
                class="date-picker"
            />
        </div>
        <div v-if="albums.length" class="albums-list">
            <div v-for="album in albums" :key="album.id" class="album-item">
                {{ album.title }}
                <button @click="removeAlbum(album.id)" class="remove-button">
                    <error />
                </button>
            </div>
        </div>
        <button
            @click="sendPost"
            class="send-button"
            :class="{ active: isButtonActive }"
            :disabled="!isButtonActive"
        >
            Отправить пост
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

const link = ref("");
const loadingLink = ref(false);
const albumId = ref("");
const ownerId = ref("");
const accessToken = ref("");
const albumExists = ref(null);
const albums = ref([]);
const postText = ref("");
const includeDate = ref(false);
const date = ref(null);
const groupId = ref(null);

const isButtonActive = computed(() => {
    return postText.value.trim() !== "" && (!includeDate.value || date.value);
});

const linkIsValid = computed(() => {
    const regex = /^https:\/\/vk\.com\/album-(\d+)_(\d+)$/;
    const match = link.value.match(regex);
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

const checkAlbumExists = async (albumId, ownerId) => {
    loadingLink.value = true;
    albumExists.value = null; // Reset the album existence status
    try {
        const response = await fetch(
            `https://api.vk.com/method/photos.getAlbums?owner_id=-${ownerId}&album_id=${albumId}&access_token=${accessToken.value}&v=5.199&count=1`
        );
        const data = await response.json();
        if (
            data.response &&
            data.response.items.length > 0 &&
            data.response.items[0].owner_id == ownerId * -1 &&
            data.response.items[0].id == albumId
        ) {
            albumExists.value = true;
            const albumTitle = data.response.items[0].title;
            const fullAlbumId = `album-${ownerId}_${albumId}`;
            albums.value.push({ id: fullAlbumId, title: albumTitle });
            link.value = ""; // Clear the link input field
            return true;
        } else {
            albumExists.value = false;
            return false;
        }
    } catch (error) {
        console.error("Error checking album existence:", error);
        albumExists.value = false;
        return false;
    } finally {
        loadingLink.value = false;
    }
};

const debouncedCheckAlbumExists = debounce(checkAlbumExists, 500);

const retrieveAccessToken = () => {
    const regex = /^\d+:web_token:login:auth$/;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (regex.test(key)) {
            const tokenData = JSON.parse(localStorage.getItem(key));
            if (tokenData && tokenData.access_token) {
                accessToken.value = tokenData.access_token;
                break;
            }
        }
    }
};

const removeAlbum = (albumId) => {
    albums.value = albums.value.filter((album) => album.id !== albumId);
};

const sendPost = async () => {
    try {
        const publishTime = includeDate.value
            ? Math.floor(new Date(date.value).getTime() / 1000)
            : null;
        const attachments = albums.value.map((album) => album.id).join(",");

        const response = await fetch(`https://api.vk.com/method/wall.post`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                owner_id: -groupId.value,
                from_group: 1,
                message: postText.value,
                attachments: attachments,
                ...(publishTime && { publish_date: publishTime }),
                access_token: accessToken.value,
                v: "5.199",
            }),
        });

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

watch(link, async (newLink) => {
    if (linkIsValid.value) {
        await debouncedCheckAlbumExists(albumId.value, ownerId.value);
    } else {
        albumExists.value = null; // Reset the album existence status when the link is invalid
    }
});

onMounted(() => {
    retrieveAccessToken();
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
    border-radius: 4px;
    margin-bottom: 8px;
}
.remove-button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
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
</style>
