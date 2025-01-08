<template>
    <Transition name="modal" v-if="active || isClosing">
        <div
            :class="['modal-bg', { open: isActive }, { close: isClosing }]"
            v-if="isActive"
            @click.self="props.closeButton ? null : closeModal()"
            v-bind="$attrs"
        >
            <div class="modal">
                <div class="modal-content">
                    <div class="modal-headline" v-if="props.headText">
                        {{ props.headText }}
                    </div>
                    <slot></slot>
                </div>
                <div class="modal-buttons" v-if="props.buttons.length > 0">
                    <div
                        :class="[
                            'button',
                            {
                                red: button.red,
                            },
                        ]"
                        v-for="button in props.buttons"
                        @click="button.onClick"
                    >
                        {{ button.text }}
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>
<script setup>
const props = defineProps({
    active: Boolean,
    transition: {
        type: Number,
        default: 250,
    },
    buttons: {
        type: Array,
        default: () => [],
    },
    headText: {
        type: String,
        default: "",
    },
});

const emit = defineEmits(["update:active", "mounted", "close"]);
const transitionString = computed(() => {
    return `${props.transition}ms`;
});

const isClosing = ref(false);
const isActive = ref(true);
const closeModal = () => {
    isClosing.value = true;
    setTimeout(() => {
        emit("update:active", false);
        emit("close");
        isActive.value = false;
        isClosing.value = false;
    }, props.transition);
};
onMounted(() => {
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && props.active) {
            closeModal();
        }
    });
});
const openModal = () => {
    isActive.value = true;
    setTimeout(() => {
        emit("mounted");
    }, props.transition);
};
watch(
    () => props.active,
    (value) => {
        if (value) {
            openModal();
        } else {
            closeModal();
        }
    }
);
</script>
<style lang="scss">
.modal-enter-active,
.modal-leave-active {
    transition: all v-bind(transitionString) ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-bg {
    position: fixed;
    inset: 0;
    background-color: rgba($color: #000000, $alpha: 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    opacity: 0;
    color: var(--vkui--color_text_primary);
    flex-direction: column;
    transition: opacity v-bind(transitionString) ease-in-out;
    backdrop-filter: blur(5px);
    padding: 10px;
    $gap: 8px;
    &.open {
        animation: open v-bind(transitionString) ease-in-out;
        opacity: 1;
    }
    &.close {
        animation: close v-bind(transitionString) ease-in-out;
        opacity: 0;
    }
    &.no-justify-content {
        justify-content: unset;
    }
    @keyframes open {
        0% {
            opacity: 0;
        }
        100% {
            opacity: 1;
        }
    }
    @keyframes close {
        0% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    .modal {
        background-color: var(--vkui--color_background_modal);
        max-width: 500px;
        min-height: 500px;
        width: 100%;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        padding: 16px;
        gap: $gap;
        box-shadow: var(--page-block-shadow);

        .modal-content {
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: $gap;
            .modal-headline {
                font-size: 1.2rem;
                text-align: center;
                margin-bottom: 16px;
            }
        }

        .modal-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;

            .button {
                padding: 5px;
                border-radius: 10px;
                background-color: var(--vkui--color_background_accent_themed);
                flex-grow: 1;
                text-align: center;
                user-select: none;
                cursor: pointer;
                &:hover {
                    background-color: var(
                        --vkui--color_background_accent_themed--hover
                    );
                }
            }
        }
    }
}
</style>
