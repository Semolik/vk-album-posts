<template>
    <div
        class="wall-button"
        @click="postStore.isModalOpen = !postStore.isModalOpen"
    >
        <span class="text">Пост с альбомом</span>
    </div>
    <modal
        v-model:active="postStore.isModalOpen"
        :headText="`${
            postStore.isEditing ? 'Отредактировать' : 'Опубликовать'
        } пост с альбомом`"
    >
        <postForm />
    </modal>
</template>
<script setup>
import modal from "./modal.vue";
import postForm from "./post-form.vue";
import { usePostStore } from "@/stores/postStore";
const postStore = usePostStore();
</script>
<style scoped lang="scss">
.wall-button {
    min-height: var(--vkui--size_button_large_height--compact);
    background: var(--vkui--color_background_content);
    border-radius: var(--vkui--size_border_radius_paper--regular);
    white-space: nowrap;
    position: relative;
    margin-block-start: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 4px 15px;
    font-size: var(--vkui--font_headline1--font_size--compact);
    &::before {
        border-radius: inherit;
        box-shadow: inset 0 0 0 var(--vkui--size_border--regular)
            var(--vkui--color_separator_primary);
        content: "";
        height: 100%;
        left: 0;
        pointer-events: none;
        position: absolute;
        top: 0;
        width: 100%;
    }
    &:hover .text {
        opacity: 0.8;
    }
}
</style>
