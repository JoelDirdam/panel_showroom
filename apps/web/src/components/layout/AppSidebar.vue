<template>
  <aside
    data-tour="app-sidebar"
    :class="[
      'fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-99999 border-r border-gray-200',
      {
        'lg:w-[290px]': isExpanded || isMobileOpen || isHovered,
        'lg:w-[90px]': !isExpanded && !isHovered,
        'translate-x-0 w-[290px]': isMobileOpen,
        '-translate-x-full': !isMobileOpen,
        'lg:translate-x-0': true,
      },
    ]"
    @mouseenter="!isExpanded && (isHovered = true)"
    @mouseleave="isHovered = false"
  >
    <div
      :class="[
        'py-8 flex',
        !isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start',
      ]"
    >
      <router-link
        to="/"
        class="font-semibold text-gray-800 dark:text-white"
      >
        <span
          v-if="isExpanded || isHovered || isMobileOpen"
          class="text-lg leading-tight"
        >
          Panel administrativo
        </span>
        <span v-else class="text-sm">PA</span>
      </router-link>
    </div>
    <div
      class="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar"
    >
      <nav class="mb-6">
        <div class="flex flex-col gap-4">
          <div v-for="(menuGroup, groupIndex) in menuGroups" :key="groupIndex">
            <h2
              :class="[
                'mb-4 text-xs uppercase flex leading-[20px] text-gray-400',
                !isExpanded && !isHovered
                  ? 'lg:justify-center'
                  : 'justify-start',
              ]"
            >
              <template v-if="isExpanded || isHovered || isMobileOpen">
                {{ menuGroup.title }}
              </template>
              <HorizontalDots v-else />
            </h2>
            <ul class="flex flex-col gap-4">
              <li v-for="(item, index) in menuGroup.items" :key="item.name">
                <button
                  v-if="item.subItems"
                  @click="toggleSubmenu(groupIndex, index)"
                  :class="[
                    'menu-item group w-full',
                    {
                      'menu-item-active': isSubmenuOpen(groupIndex, index),
                      'menu-item-inactive': !isSubmenuOpen(groupIndex, index),
                    },
                    !isExpanded && !isHovered
                      ? 'lg:justify-center'
                      : 'lg:justify-start',
                  ]"
                >
                  <span
                    :class="[
                      isSubmenuOpen(groupIndex, index)
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="item.icon" />
                  </span>
                  <span
                    v-if="isExpanded || isHovered || isMobileOpen"
                    class="menu-item-text"
                    >{{ item.name }}</span
                  >
                  <ChevronDownIcon
                    v-if="isExpanded || isHovered || isMobileOpen"
                    :class="[
                      'ml-auto w-5 h-5 transition-transform duration-200',
                      {
                        'rotate-180 text-brand-500': isSubmenuOpen(
                          groupIndex,
                          index
                        ),
                      },
                    ]"
                  />
                </button>
                <router-link
                  v-else-if="item.path"
                  :to="item.path"
                  :data-tour="item.tourKey"
                  :class="[
                    'menu-item group relative',
                    {
                      'menu-item-active': isActive(item.path),
                      'menu-item-inactive': !isActive(item.path),
                    },
                  ]"
                >
                  <span
                    :class="[
                      isActive(item.path)
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="item.icon" />
                  </span>
                  <span
                    v-if="isExpanded || isHovered || isMobileOpen"
                    class="menu-item-text"
                    >{{ item.name }}</span
                  >
                  <span
                    v-if="item.badge && (isExpanded || isHovered || isMobileOpen)"
                    class="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-error-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
                  >
                    {{ item.badge }}
                  </span>
                  <span
                    v-else-if="item.badge"
                    class="absolute right-2 top-1.5 size-2 rounded-full bg-error-500"
                    aria-hidden="true"
                  />
                </router-link>
                <transition
                  @enter="startTransition"
                  @after-enter="endTransition"
                  @before-leave="startTransition"
                  @after-leave="endTransition"
                >
                  <div
                    v-show="
                      isSubmenuOpen(groupIndex, index) &&
                      (isExpanded || isHovered || isMobileOpen)
                    "
                  >
                    <ul class="mt-2 space-y-1 ml-9">
                      <li v-for="subItem in item.subItems" :key="subItem.name">
                        <router-link
                          :to="subItem.path"
                          :class="[
                            'menu-dropdown-item',
                            {
                              'menu-dropdown-item-active': isActive(
                                subItem.path
                              ),
                              'menu-dropdown-item-inactive': !isActive(
                                subItem.path
                              ),
                            },
                          ]"
                        >
                          {{ subItem.name }}
                          <span class="flex items-center gap-1 ml-auto">
                            <span
                              v-if="subItem.new"
                              :class="[
                                'menu-dropdown-badge',
                                {
                                  'menu-dropdown-badge-active': isActive(
                                    subItem.path
                                  ),
                                  'menu-dropdown-badge-inactive': !isActive(
                                    subItem.path
                                  ),
                                },
                              ]"
                            >
                              new
                            </span>
                            <span
                              v-if="subItem.pro"
                              :class="[
                                'menu-dropdown-badge',
                                {
                                  'menu-dropdown-badge-active': isActive(
                                    subItem.path
                                  ),
                                  'menu-dropdown-badge-inactive': !isActive(
                                    subItem.path
                                  ),
                                },
                              ]"
                            >
                              pro
                            </span>
                          </span>
                        </router-link>
                      </li>
                    </ul>
                  </div>
                </transition>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </div>
  </aside>
</template>

<script setup>
import { computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useProductRequestsStore } from "@/stores/productRequests";

import {
  LayoutDashboard,
  Box,
  CalendarDays,
  Goal,
  Store,
  Users,
} from "lucide-vue-next";
import { BoxesIcon, ChevronDownIcon, HorizontalDots, BookOpenPesoIcon } from "../../icons";
import { useSidebar } from "@/composables/useSidebar";

const route = useRoute();
const auth = useAuthStore();
const productRequests = useProductRequestsStore();

const { isExpanded, isMobileOpen, isHovered, openSubmenu } = useSidebar();

// `moduleId` prepara el filtrado por plan (ver apps/web/src/lib/entitlements.ts).
// Hoy `auth.canAccess` siempre regresa `true` porque `/auth/me` todavía no
// envía `entitlements`, así que este filtro no cambia nada del showroom
// actual — queda listo para cuando el plan del tenant viaje en la sesión.
const menuGroups = computed(() => [
  {
    title: "Showroom",
    items: [
      {
        icon: LayoutDashboard,
        name: "Dashboard",
        path: "/",
        tourKey: "sidebar-dashboard",
        moduleId: "dashboard",
      },
      ...(auth.isAdmin
        ? [
            {
              icon: Box,
              name: "Marcas",
              path: "/brands",
              tourKey: "sidebar-brands",
              moduleId: "brands",
            },
          ]
        : []),
      {
        icon: BoxesIcon,
        name: "Productos",
        path: "/products",
        tourKey: "sidebar-products",
        moduleId: "products",
      },
      {
        icon: Goal,
        name: auth.isAdmin ? "Órdenes" : "Solicitar productos",
        path: "/product-requests",
        tourKey: "sidebar-requests",
        moduleId: "productRequests",
        badge:
          productRequests.pendingCount > 0
            ? productRequests.pendingCount > 99
              ? "99+"
              : String(productRequests.pendingCount)
            : undefined,
      },
      {
        icon: CalendarDays,
        name: "Agenda",
        path: "/agenda",
        tourKey: "sidebar-agenda",
        moduleId: "agenda",
      },
      ...(auth.isAdmin
        ? [
            {
              icon: Store,
              name: "Caja",
              path: "/caja",
              tourKey: "sidebar-caja",
              moduleId: "caja",
            },
            {
              icon: Users,
              name: "Empleados",
              path: "/employees",
              tourKey: "sidebar-employees",
              moduleId: "employees",
            },
          ]
        : []),
      {
        icon: BookOpenPesoIcon,
        name: "Ventas/Tickets",
        path: "/sales",
        tourKey: "sidebar-sales",
        moduleId: "sales",
      },
    ].filter((item) => auth.canAccess(item.moduleId)),
  },
]);

const isActive = (path) => route.path === path;

const toggleSubmenu = (groupIndex, itemIndex) => {
  const key = `${groupIndex}-${itemIndex}`;
  openSubmenu.value = openSubmenu.value === key ? null : key;
};

const isAnySubmenuRouteActive = computed(() => {
  return menuGroups.value.some((group) =>
    group.items.some(
      (item) =>
        item.subItems && item.subItems.some((subItem) => isActive(subItem.path))
    )
  );
});

const isSubmenuOpen = (groupIndex, itemIndex) => {
  const key = `${groupIndex}-${itemIndex}`;
  return (
    openSubmenu.value === key ||
    (isAnySubmenuRouteActive.value &&
      menuGroups.value[groupIndex].items[itemIndex].subItems?.some((subItem) =>
        isActive(subItem.path)
      ))
  );
};

const startTransition = (el) => {
  el.style.height = "auto";
  const height = el.scrollHeight;
  el.style.height = "0px";
  el.offsetHeight; // force reflow
  el.style.height = height + "px";
};

const endTransition = (el) => {
  el.style.height = "";
};

onMounted(() => {
  if (auth.isAuthenticated) productRequests.fetchPendingCount();
});

watch(
  () => auth.isAuthenticated,
  (ok) => {
    if (ok) productRequests.fetchPendingCount();
    else productRequests.clear();
  }
);

watch(
  () => route.path,
  (path) => {
    if (path === "/product-requests" && auth.isAuthenticated) {
      productRequests.fetchPendingCount();
    }
  }
);
</script>
