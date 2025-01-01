<template>
    <div class="field">
        <label :for="id" v-if="label">{{ label }}</label>
        <textarea
            v-if="type === 'textarea'"
            :id="id"
            :placeholder="placeholder"
            v-model="value"
            class="textarea"
        ></textarea>
        <div v-else :class="['input-wrapper', { error }]">
            <input :id="id" :placeholder="placeholder" v-model="value" />
            <div class="icon">
                <slot name="icon"></slot>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
    id: String,
    label: {
        type: String,
        required: false,
    },
    placeholder: {
        type: String,
        required: false,
    },
    modelValue: String,
    error: {
        type: Boolean,
        required: false,
    },
    type: {
        type: String,
        required: false,
        default: "input",
    },
});

const emit = defineEmits(["update:modelValue"]);

const value = computed({
    get: () => props.modelValue,
    set: (val) => emit("update:modelValue", val),
});
</script>

<style lang="scss" scoped>
.field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 2;

    label {
        font-size: 1em;
        color: var(--vkui--color_icon_medium);
    }

    .textarea {
        background-color: var(--vkui--color_search_field_background);
        border-radius: var(--vkui--size_border_radius--regular);
        border: 1px solid transparent;
        padding: 10px;
        height: 250px; /* Fixed height */
        width: 100%;
        box-sizing: border-box;
        resize: none; /* Disable resizing */
        outline: none; /* Remove focus outline */

        &.error {
            border-color: var(--vkui--color_text_negative);
        }
    }

    .input-wrapper {
        background-color: var(--vkui--color_search_field_background);
        border-radius: var(--vkui--size_border_radius--regular);
        position: relative;
        min-height: 38px;
        border: 1px solid transparent;

        &.error {
            border-color: var(--vkui--color_text_negative);
        }

        input {
            all: unset;
            position: absolute;
            inset: 0;
            padding: 10px;
        }

        &:has(:not(.icon:empty)) {
            input {
                padding-right: 30px;
            }
        }

        .icon {
            &:empty {
                display: none;
            }
            display: flex;
            position: absolute;
            right: 5px;
            top: 0;
            bottom: 0;
            justify-content: center;
            align-items: center;

            svg {
                width: 20px;
                height: 20px;
            }
        }
    }
}
</style>
