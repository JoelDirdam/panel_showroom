<template>
  <admin-layout>
    <page-breadcrumb page-title="Caja" />

    <div
      v-if="prefsBanner"
      class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
    >
      {{ prefsBanner }}
      <router-link to="/preferences" class="ml-2 font-medium underline">Ir a Preferencias</router-link>
    </div>

    <div
      v-if="!loadingEmployees"
      class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
    >
      <template v-if="employees.length === 0">
        Puedes atender tú mismo ahora. También puedes
        <router-link to="/employees" class="font-medium underline">registrar empleados</router-link>
        para asignarlos en Caja.
      </template>
      <template v-else>
        Tip: si quieres que más personas atiendan, gestiona el equipo en
        <router-link to="/employees" class="font-medium underline">Empleados</router-link>.
      </template>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-2" data-tour="caja-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="inline-flex items-stretch overflow-hidden rounded-lg border text-sm font-medium transition"
        :class="
          tab.id === activeId
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
        "
      >
        <button
          type="button"
          class="py-1.5 pl-3 pr-1"
          :aria-pressed="tab.id === activeId"
          @click="selectTab(tab.id)"
        >
          {{ tab.label }}
          <span v-if="tab.lines.length" class="ml-1 text-xs opacity-80">({{ tab.lines.length }})</span>
        </button>
        <button
          type="button"
          class="px-2 text-base leading-none opacity-80 hover:bg-black/10 hover:opacity-100"
          :title="`Cerrar ${tab.label}`"
          :aria-label="`Cerrar ${tab.label}`"
          @click="requestCloseTab(tab)"
        >
          ×
        </button>
      </div>
      <button
        type="button"
        class="ui-btn ui-btn-secondary ui-btn-sm"
        :disabled="tabs.length >= MAX_CAJAS"
        @click="addTab"
      >
        + Nueva caja
      </button>
      <span class="ml-auto text-xs text-gray-500">{{ tabs.length }}/{{ MAX_CAJAS }} abiertas</span>
      <router-link
        to="/corte-caja"
        class="ui-btn ui-btn-secondary ui-btn-sm"
      >
        Corte de caja
      </router-link>
    </div>

    <div class="grid gap-4 pb-20 xl:grid-cols-3 xl:pb-0">
      <!-- Columna izquierda -->
      <div class="space-y-4 xl:col-span-2">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-sm font-semibold text-gray-800 dark:text-white">
            Buscar o escanear producto
          </h3>
          <div class="relative" data-tour="caja-search">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              class="ui-input w-full"
              placeholder="Escanea o busca por código, nombre o marca"
              autocomplete="off"
              autocapitalize="off"
              enterkeyhint="search"
              aria-label="Buscar o escanear producto"
              @input="scheduleSearch"
              @keydown="onSearchKeydown"
              @focus="showSearchDropdown = true"
              @blur="showSearchDropdown = false"
            />
            <ul
              v-if="showSearchDropdown && searchResults.length"
              class="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
            >
              <li
                v-for="(p, i) in searchResults"
                :key="p.id"
                class="cursor-pointer px-4 py-2 text-sm"
                :class="i === searchHighlight ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'"
                @mousedown.prevent="pickSearchProduct(p)"
              >
                <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span class="min-w-0 break-words">
                    <span class="font-medium text-gray-800 dark:text-white">{{ p.name }}</span>
                    <span class="ml-2 text-xs text-gray-500">{{ p.sku }} · {{ p.brand.name }}</span>
                  </span>
                  <span class="text-xs text-gray-500">
                    <span v-if="p.price === null" class="text-error-500">Sin precio</span>
                    <template v-else>${{ formatMoney(Number(p.price)) }}</template>
                    ·
                    <span v-if="(p.stock?.quantity ?? 0) <= 0" class="text-error-500">Sin stock</span>
                    <template v-else>stock {{ p.stock?.quantity }}</template>
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <p v-if="searchMsg" class="mt-2 text-sm text-error-500" role="alert">
            {{ searchMsg }}
          </p>
        </div>

        <div
          class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
          data-tour="caja-cart"
        >
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-white">Artículos en venta</h3>
            <span class="text-xs text-gray-500">
              {{ itemCount }} {{ itemCount === 1 ? 'pieza' : 'piezas' }}
            </span>
          </div>

          <div v-if="activeTab.lines.length === 0" class="py-12 text-center text-sm text-gray-500">
            Busca o escanea un producto para comenzar la venta
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="line in activeTab.lines"
              :key="line.productId"
              class="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="break-words font-medium text-gray-800 dark:text-white">{{ line.name }}</p>
                  <p class="text-xs uppercase tracking-wide text-gray-500">
                    Marca: {{ line.brandName }}
                  </p>
                  <p class="text-xs text-gray-500">
                    ${{ formatMoney(line.unitPrice) }} c/u · Stock disponible: {{ line.stock }}
                  </p>
                </div>
                <p class="text-lg font-semibold text-gray-800 dark:text-white">
                  ${{ formatMoney(lineTotal(line)) }}
                </p>
              </div>
              <div class="mt-3 flex flex-wrap items-end gap-3">
                <label class="text-xs text-gray-500">
                  Descuento ($)
                  <input
                    v-model.number="line.discount"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    :max="round2(line.unitPrice * line.quantity)"
                    step="0.01"
                    @change="fixLine(line)"
                    class="ui-input mt-1 w-28"
                  />
                </label>
                <div class="text-xs text-gray-500">
                  Cantidad
                  <div class="mt-1 flex items-center gap-1">
                    <button
                      type="button"
                      class="h-9 w-9 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
                      :aria-label="`Quitar una pieza de ${line.name}`"
                      :disabled="line.quantity <= 1"
                      @click="stepQuantity(line, -1)"
                    >
                      −
                    </button>
                    <input
                      v-model.number="line.quantity"
                      type="number"
                      inputmode="numeric"
                      min="1"
                      step="1"
                      :max="line.stock || undefined"
                      :aria-label="`Cantidad de ${line.name}`"
                      @change="fixLine(line)"
                      class="ui-input w-16 text-center"
                    />
                    <button
                      type="button"
                      class="h-9 w-9 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
                      :aria-label="`Agregar una pieza de ${line.name}`"
                      :disabled="line.stock > 0 && line.quantity >= line.stock"
                      @click="stepQuantity(line, 1)"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  class="ui-btn ui-btn-danger ui-btn-sm ml-auto"
                  :aria-label="`Quitar ${line.name} de la venta`"
                  @click="removeLine(line.productId)"
                >
                  Quitar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumen -->
      <div class="space-y-4">
        <div
          id="caja-summary"
          class="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
          data-tour="caja-summary"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-white">Resumen rápido</h3>
            <span class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10">
              Ticket
            </span>
          </div>

          <label for="caja-attendant" class="mb-1 block text-xs text-gray-500">Atiende</label>
          <select
            id="caja-attendant"
            v-model="activeTab.attendedById"
            data-tour="caja-attendant"
            class="ui-input mb-1 w-full"
          >
            <option value="">— Seleccionar —</option>
            <option v-if="auth.user" :value="SELF_ATTENDANT">Yo ({{ auth.user.name }})</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.name }}</option>
          </select>
          <p class="mb-4 text-xs text-gray-500">
            {{ attendantLabel }}
          </p>

          <div class="space-y-2 text-sm">
            <div class="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Subtotal sin descuentos</span>
              <span>${{ formatMoney(grossSubtotal) }}</span>
            </div>
            <div class="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Total con descuentos</span>
              <span>${{ formatMoney(subtotalWithDiscount) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600 dark:text-gray-300">
                {{ pricesIncludeIva ? 'Desglosar IVA (ya incluido)' : 'Aplicar IVA (16%)' }}
              </span>
              <button
                type="button"
                role="switch"
                :aria-checked="activeTab.applyTax"
                :aria-label="pricesIncludeIva ? 'Desglosar IVA incluido' : 'Aplicar IVA (16%)'"
                class="rounded-full px-3 py-1 text-xs font-medium"
                :class="
                  activeTab.applyTax
                    ? 'bg-success-500 text-white'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                "
                @click="activeTab.applyTax = !activeTab.applyTax"
              >
                {{ activeTab.applyTax ? 'Activado' : 'Desactivado' }}
              </button>
            </div>
            <div v-if="activeTab.applyTax" class="flex justify-between text-gray-600 dark:text-gray-300">
              <span>{{ pricesIncludeIva ? 'IVA incluido (16%)' : 'IVA (16%)' }}</span>
              <span>${{ formatMoney(taxAmount) }}</span>
            </div>
            <div
              v-if="giftCardApplied > 0"
              class="flex justify-between text-success-600"
            >
              <span>Tarjeta de regalo</span>
              <span>−${{ formatMoney(giftCardApplied) }}</span>
            </div>
            <div class="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-800 dark:border-gray-800 dark:text-white">
              <span>Total a pagar</span>
              <span data-tour="caja-total">${{ formatMoney(totalToPay) }}</span>
            </div>
          </div>

          <div v-if="usdEnabled" class="mt-5 rounded-xl bg-gray-50 p-3 dark:bg-gray-900/50">
            <p class="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              Conversor pesos a dólares
            </p>
            <label class="text-xs text-gray-500">
              Monto en pesos
              <input
                v-model.number="activeTab.converterPesos"
                type="number"
                min="0"
                step="0.01"
                class="ui-input mt-1 w-full"
              />
            </label>
            <div class="mt-2 flex gap-2">
              <button
                type="button"
                class="ui-btn ui-btn-secondary ui-btn-sm"
                @click="activeTab.converterPesos = totalToPay"
              >
                Usar total
              </button>
              <button
                type="button"
                class="ui-btn ui-btn-secondary ui-btn-sm"
                @click="activeTab.converterPesos = changeDue"
              >
                Usar cambio
              </button>
            </div>
            <p class="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Equivalente en USD: ${{ formatMoney((activeTab.converterPesos || 0) / usdRate) }} USD
              <span class="text-gray-400">(tasa {{ usdRate }})</span>
            </p>
          </div>

          <div
            v-if="commissionHint"
            class="mt-3 rounded-lg border border-gray-100 bg-white/60 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-300"
          >
            {{ commissionHint }}
          </div>

          <div v-if="activeTab.paymentMethod === 'EFECTIVO'" class="mt-4">
            <label class="text-xs text-gray-500">
              Efectivo recibido
              <input
                v-model.number="activeTab.cashReceived"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                class="ui-input mt-1 w-full"
              />
            </label>
            <p v-if="cashShort > 0" class="mt-1 text-xs text-error-500">
              Faltan ${{ formatMoney(cashShort) }} para cubrir el total
            </p>
            <p v-else-if="changeDue > 0" class="mt-1 text-sm font-medium text-success-600">
              Cambio: ${{ formatMoney(changeDue) }}
            </p>
          </div>

          <button
            type="button"
            class="mt-4 w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            :disabled="saving || activeTab.lines.length === 0"
            @click="createLayaway"
          >
            + Crear apartado
          </button>

          <p class="mb-2 mt-4 text-xs font-medium text-gray-600 dark:text-gray-300">Forma de pago</p>
          <div class="grid grid-cols-2 gap-2" data-tour="caja-payment">
            <button
              v-for="opt in paymentOptions"
              :key="opt.value"
              type="button"
              :aria-pressed="activeTab.paymentMethod === opt.value"
              class="rounded-xl border px-3 py-3 text-sm font-medium transition"
              :class="
                activeTab.paymentMethod === opt.value
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-brand-200 text-brand-600 hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-400'
              "
              @click="activeTab.paymentMethod = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>

          <div
            v-if="activeTab.paymentMethod === 'MIXTO'"
            class="mt-3 space-y-2 rounded-xl border border-gray-100 p-3 dark:border-gray-800"
          >
            <label
              v-for="field in mixedFields"
              :key="field.key"
              class="block text-xs text-gray-500"
            >
              {{ field.label }}
              <input
                v-model.number="activeTab.mixed[field.key]"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                class="ui-input mt-1 w-full"
              />
            </label>
            <p class="text-xs" :class="mixedOk ? 'text-success-600' : 'text-error-500'">
              Suma: ${{ formatMoney(mixedSum) }} / ${{ formatMoney(totalToPay) }}
              <template v-if="!mixedOk">
                · {{ mixedSum < totalToPay ? 'faltan' : 'sobran' }}
                ${{ formatMoney(Math.abs(totalToPay - mixedSum)) }}
              </template>
            </p>
          </div>

          <button
            type="button"
            data-tour="caja-confirm"
            class="ui-btn ui-btn-primary mt-4 w-full"
            :disabled="saving || activeTab.lines.length === 0"
            @click="confirmSale"
          >
            {{ saving ? 'Registrando…' : 'Confirmar compra' }}
          </button>

          <p v-if="formError" class="mt-3 text-sm text-error-500" role="alert">{{ formError }}</p>
          <p v-if="successMsg" class="mt-3 text-sm text-success-600" role="status">
            {{ successMsg }}
            <button v-if="lastSale" type="button" class="ml-1 font-medium underline" @click="showTicket = true">
              Ver ticket
            </button>
          </p>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h4 class="mb-2 text-sm font-semibold text-gray-800 dark:text-white">Descuentos aplicados</h4>
          <p v-if="discountTotal <= 0" class="text-sm text-gray-500">No hay descuentos aplicados</p>
          <p v-else class="text-sm text-gray-700 dark:text-gray-300">
            Total descuentos: ${{ formatMoney(discountTotal) }}
          </p>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <label for="caja-gift-code" class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Código de tarjeta de regalo
          </label>
          <div class="flex gap-2">
            <input
              id="caja-gift-code"
              v-model="activeTab.giftCardCode"
              type="text"
              autocomplete="off"
              autocapitalize="characters"
              placeholder="Escanea o ingresa el código"
              class="ui-input min-w-0 flex-1"
              @input="onGiftCodeInput"
              @keydown.enter.prevent="applyGiftCard"
            />
            <button
              type="button"
              class="ui-btn ui-btn-primary"
              :disabled="giftLoading"
              @click="applyGiftCard"
            >
              {{ giftLoading ? '…' : 'Aplicar' }}
            </button>
          </div>
          <p v-if="activeTab.giftCardBalance > 0" class="mt-1 text-xs text-success-600">
            Saldo ${{ formatMoney(activeTab.giftCardBalance) }} · se aplicarán ${{ formatMoney(giftCardApplied) }}
            <button type="button" class="ml-2 underline" @click="clearGiftCard">Quitar</button>
          </p>
          <p v-else-if="giftMsg" class="mt-1 text-xs text-error-500" role="alert">{{ giftMsg }}</p>

          <label for="caja-customer" class="mb-1 mt-4 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Cliente (opcional)
          </label>
          <div class="relative">
            <input
              id="caja-customer"
              v-model="customerQuery"
              type="text"
              autocomplete="off"
              placeholder="Busca por nombre o teléfono"
              class="ui-input w-full"
              @input="searchCustomers"
              @keydown.enter.prevent="createOrSelectCustomer"
              @keydown.esc="closeCustomerDropdown"
              @blur="closeCustomerDropdown"
            />
            <ul
              v-if="customerDropdownOpen"
              class="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-900"
            >
              <li
                v-for="c in customerResults"
                :key="c.id"
                class="cursor-pointer break-words px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800"
                @mousedown.prevent="selectCustomer(c)"
              >
                {{ c.name }}
                <span v-if="c.phone" class="text-xs text-gray-500">· {{ c.phone }}</span>
              </li>
              <li v-if="customerResults.length === 0" class="px-3 py-2 text-xs text-gray-500">
                Sin coincidencias
              </li>
              <li
                class="cursor-pointer break-words border-t border-gray-100 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50 dark:border-gray-800 dark:text-brand-400 dark:hover:bg-gray-800"
                @mousedown.prevent="openNewCustomer"
              >
                + Crear cliente «{{ customerQuery.trim() }}»
              </li>
            </ul>
          </div>
          <p v-if="customerMsg" class="mt-1 text-xs text-error-500" role="alert">{{ customerMsg }}</p>

          <form
            v-if="newCustomer.open"
            class="mt-2 space-y-2 rounded-lg border border-gray-100 p-3 dark:border-gray-800"
            @submit.prevent="saveNewCustomer"
          >
            <p class="text-xs font-medium text-gray-700 dark:text-gray-200">Nuevo cliente</p>
            <label class="block text-xs text-gray-500">
              Nombre
              <input
                ref="newCustomerNameRef"
                v-model="newCustomer.name"
                type="text"
                maxlength="200"
                autocomplete="off"
                class="ui-input mt-1 w-full"
              />
            </label>
            <label class="block text-xs text-gray-500">
              Teléfono (opcional)
              <input
                v-model="newCustomer.phone"
                type="tel"
                inputmode="tel"
                maxlength="40"
                autocomplete="off"
                class="ui-input mt-1 w-full"
              />
            </label>
            <div class="flex gap-2">
              <button
                type="submit"
                class="ui-btn ui-btn-primary ui-btn-sm"
                :disabled="newCustomer.saving"
              >
                {{ newCustomer.saving ? 'Guardando…' : 'Guardar cliente' }}
              </button>
              <button
                type="button"
                class="ui-btn ui-btn-secondary ui-btn-sm"
                @click="newCustomer.open = false"
              >
                Cancelar
              </button>
            </div>
          </form>

          <p v-if="activeTab.customerLabel" class="mt-1 break-words text-xs text-brand-600">
            Seleccionado: {{ activeTab.customerLabel }}
            <button type="button" class="ml-2 underline" @click="clearCustomer">Quitar</button>
          </p>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h4 class="mb-1 text-sm font-semibold text-gray-800 dark:text-white">Comentario en ticket</h4>
          <p class="mb-2 text-xs text-gray-500">
            Nota única de esta venta (independiente de los comentarios fijos del negocio).
          </p>
          <div
            v-if="ticketFixedComment"
            class="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-900/50 dark:text-gray-300"
          >
            <span class="font-medium">Texto fijo del ticket:</span>
            {{ ticketFixedComment }}
          </div>
          <textarea
            v-model="activeTab.ticketComment"
            maxlength="500"
            rows="3"
            placeholder="Ej. Cliente solicita entregar mañana por la tarde"
            class="ui-input w-full"
          />
          <p class="mt-1 text-xs text-gray-400">
            Máximo 500 caracteres · {{ activeTab.ticketComment.length }}/500
          </p>
        </div>
      </div>
    </div>

    <!-- En pantallas chicas el resumen queda abajo del carrito: el total va siempre a la vista. -->
    <div
      v-if="activeTab.lines.length > 0"
      class="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] xl:hidden dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="min-w-0">
        <p class="text-xs text-gray-500">{{ itemCount }} {{ itemCount === 1 ? 'pieza' : 'piezas' }} · Total</p>
        <p class="text-lg font-semibold text-gray-800 dark:text-white">${{ formatMoney(totalToPay) }}</p>
      </div>
      <button
        type="button"
        class="ui-btn ui-btn-primary"
        @click="goToSummary"
      >
        Cobrar
      </button>
    </div>

    <sale-ticket
      v-if="showTicket && lastSale"
      :sale="lastSale.sale"
      :cash-received="lastSale.cashReceived"
      :change="lastSale.change"
      @close="closeTicket"
    />
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import SaleTicket from '@/components/pos/SaleTicket.vue'
import api, {
  fetchEmployees,
  fetchPreferences,
  type BusinessPreferences,
  type CreateLayawayPayload,
  type CreateSalePayload,
  type Customer,
  type Employee,
  type GiftCardPreview,
  type PaymentMethod,
  type Product,
  type Sale,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import {
  DEFAULT_USD_RATE,
  MAX_CAJAS,
  formatMoney,
  lineTotal,
  num,
  round2,
  useCajaSession,
  type CajaTabState,
  type CartLine,
} from '@/composables/useCajaSession'

const auth = useAuthStore()
const prefs = ref<BusinessPreferences | null>(null)
const employees = ref<Employee[]>([])
const loadingEmployees = ref(true)
/** Valor especial del select: el dueño BUSINESS atiende sin Employee. */
const SELF_ATTENDANT = '__self__'

const usdEnabled = computed(() => !!prefs.value?.usdEnabled)
const usdRate = computed(() => {
  const p = prefs.value
  if (p?.usdEnabled && p.usdRateMode === 'FIXED' && p.usdFixedRate) {
    const n = Number(p.usdFixedRate)
    if (Number.isFinite(n) && n > 0) return n
  }
  return DEFAULT_USD_RATE
})
const pricesIncludeIva = computed(() => !!prefs.value?.pricesIncludeIva)
const ticketFixedComment = computed(() => prefs.value?.ticketFixedComment?.trim() || '')
const prefsBanner = computed(() => {
  const p = prefs.value
  if (!p) {
    return 'Configura las preferencias del negocio para que Caja use tu tasa USD, IVA y textos de ticket.'
  }
  if (p.usdEnabled && p.usdRateMode === 'FIXED' && !p.usdFixedRate) {
    return 'USD está activado en modo fijo pero falta la tasa. Complétala en Preferencias.'
  }
  if (p.createdAt && p.updatedAt && p.createdAt === p.updatedAt) {
    return 'Configura las preferencias del negocio para que Caja use tu tasa USD, IVA y textos de ticket.'
  }
  return ''
})

const commissionHint = computed(() => {
  const p = prefs.value
  if (!p) return ''
  const method = activeTab.value.paymentMethod
  const parts: string[] = []
  if (method === 'TARJETA' || method === 'MIXTO') {
    if (p.primaryTerminalCommission) {
      parts.push(`Comisión terminal 1: ${p.primaryTerminalCommission}%`)
    }
    if (p.secondaryTerminalCommission) {
      parts.push(`Comisión terminal 2: ${p.secondaryTerminalCommission}%`)
    }
  }
  if (method === 'TRANSFERENCIA' || method === 'MIXTO') {
    if (p.transferCommission) {
      parts.push(`Comisión transferencia: ${p.transferCommission}%`)
    }
  }
  return parts.length ? `Referencia (no altera el total): ${parts.join(' · ')}` : ''
})

const {
  tabs,
  activeId,
  activeTab,
  addTab,
  closeTab,
  selectTab,
  resetTab,
  addProduct,
  removeLine,
  grossSubtotal,
  discountTotal,
  subtotalWithDiscount,
  taxAmount,
  totalBeforeGift,
  giftCardApplied,
  totalToPay,
  changeDue,
  mixedPayments,
} = useCajaSession({
  defaultAttendedById: () => employees.value[0]?.id || SELF_ATTENDANT,
  defaultApplyTax: () => !!prefs.value?.chargeIva,
  pricesIncludeTax: () => pricesIncludeIva.value,
  // Un carrito a medias no debe aparecerle a otra cuenta que entre en este navegador.
  storageScope: auth.user ? `${auth.user.tenantId ?? ''}:${auth.user.id}` : undefined,
})

const itemCount = computed(() => activeTab.value.lines.reduce((s, l) => s + num(l.quantity), 0))

/** Efectivo capturado que no alcanza a cubrir el total (0 si no se capturó o sí alcanza). */
const cashShort = computed(() => {
  if (activeTab.value.paymentMethod !== 'EFECTIVO') return 0
  const received = num(activeTab.value.cashReceived)
  if (received <= 0) return 0
  return round2(Math.max(0, totalToPay.value - received))
})

/** Última venta cobrada, para mostrar o reimprimir su ticket. */
const lastSale = ref<{ sale: Sale; cashReceived: number; change: number } | null>(null)
const showTicket = ref(false)

function closeTicket() {
  showTicket.value = false
  void nextTick(() => searchInputRef.value?.focus())
}

function goToSummary() {
  document.getElementById('caja-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function requestCloseTab(tab: CajaTabState) {
  if (
    tab.lines.length > 0 &&
    !window.confirm(`${tab.label} tiene ${tab.lines.length} artículo(s) sin cobrar. ¿Cerrarla y descartarlos?`)
  ) {
    return
  }
  closeTab(tab.id)
}

/**
 * Deja la línea en valores válidos: cantidad entera entre 1 y el stock, y
 * descuento entre 0 y el importe de la línea. Devuelve true si tuvo que corregir.
 */
function fixLine(line: CartLine): boolean {
  let changed = false
  let qty = Math.floor(num(line.quantity))
  if (qty < 1) qty = 1
  if (line.stock > 0 && qty > line.stock) qty = line.stock
  if (qty !== line.quantity) {
    line.quantity = qty
    changed = true
  }
  const maxDiscount = round2(num(line.unitPrice) * qty)
  const discount = Math.min(maxDiscount, round2(Math.max(0, num(line.discount))))
  if (discount !== line.discount) {
    line.discount = discount
    changed = true
  }
  return changed
}

function stepQuantity(line: CartLine, delta: number) {
  line.quantity = Math.floor(num(line.quantity)) + delta
  fixLine(line)
}

/** Valida el carrito antes de cobrar o apartar. Devuelve el mensaje de error, o '' si todo está bien. */
function cartError(): string {
  if (activeTab.value.lines.length === 0) return 'Agrega al menos un producto'
  const fixed = activeTab.value.lines.filter((l) => fixLine(l)).map((l) => l.name)
  if (fixed.length) {
    return `Se ajustó la cantidad o el descuento de: ${fixed.join(', ')}. Revisa el total y confirma de nuevo.`
  }
  return ''
}

const searchQuery = ref('')
const searchResults = ref<Product[]>([])
const showSearchDropdown = ref(false)
const searchHighlight = ref(0)
const searchInputRef = ref<HTMLInputElement | null>(null)
const searchTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const saving = ref(false)
const formError = ref('')
const successMsg = ref('')
const searchMsg = ref('')
let searchSeq = 0
const giftMsg = ref('')
const giftLoading = ref(false)
const customerQuery = ref('')
const customerResults = ref<Customer[]>([])
const customerDropdownOpen = ref(false)
const customerMsg = ref('')
let customerTimer: ReturnType<typeof setTimeout> | null = null
let customerSeq = 0
const newCustomer = reactive({ open: false, name: '', phone: '', saving: false })
const newCustomerNameRef = ref<HTMLInputElement | null>(null)

function apiError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } } }
  if (!err.response) return 'Sin conexión con el servidor. Intenta de nuevo.'
  return err.response.data?.error || fallback
}

const paymentOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'MIXTO', label: 'Mixto' },
]

const mixedFields = [
  { key: 'efectivo' as const, label: 'Efectivo' },
  { key: 'tarjeta' as const, label: 'Tarjeta' },
  { key: 'transferencia' as const, label: 'Transferencia' },
]

const mixedSum = computed(() =>
  round2(
    num(activeTab.value.mixed.efectivo) +
      num(activeTab.value.mixed.tarjeta) +
      num(activeTab.value.mixed.transferencia),
  ),
)

const mixedOk = computed(() => Math.abs(mixedSum.value - totalToPay.value) < 0.01)

const attendantLabel = computed(() => {
  if (activeTab.value.attendedById === SELF_ATTENDANT && auth.user) {
    return `${auth.user.name} · Tu cuenta`
  }
  const e = employees.value.find((x) => x.id === activeTab.value.attendedById)
  return e ? `${e.name} · Empleado` : ''
})

function scheduleSearch() {
  if (searchTimer.value) clearTimeout(searchTimer.value)
  searchTimer.value = setTimeout(() => void runSearch(), 200)
}

async function runSearch() {
  const q = searchQuery.value.trim()
  const seq = ++searchSeq
  searchMsg.value = ''
  if (!q) {
    searchResults.value = []
    return
  }
  try {
    const { data } = await api.get<Product[]>('/products', { params: { q } })
    // Una respuesta lenta de una búsqueda anterior no debe pisar la más reciente.
    if (seq !== searchSeq) return
    searchResults.value = data.slice(0, 30)
    searchHighlight.value = 0
    showSearchDropdown.value = true
  } catch (e: unknown) {
    if (seq !== searchSeq) return
    searchResults.value = []
    searchMsg.value = apiError(e, 'No se pudo buscar el producto')
  }
}

function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (!searchResults.value.length) return
    searchHighlight.value = (searchHighlight.value + 1) % searchResults.value.length
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (!searchResults.value.length) return
    searchHighlight.value =
      (searchHighlight.value - 1 + searchResults.value.length) % searchResults.value.length
    return
  }
  if (e.key === 'Escape') {
    showSearchDropdown.value = false
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    void commitSearch()
  }
}

async function commitSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  if (searchTimer.value) clearTimeout(searchTimer.value)
  await runSearch()
  if (searchMsg.value) return
  const exact = searchResults.value.find((p) => p.sku.toLowerCase() === q.toLowerCase())
  const pick = exact || searchResults.value[searchHighlight.value]
  if (!pick) {
    searchMsg.value = `No se encontró ningún producto con «${q}»`
    return
  }
  pickSearchProduct(pick)
}

function pickSearchProduct(product: Product) {
  formError.value = ''
  successMsg.value = ''
  searchMsg.value = addProduct(product) || ''
  searchQuery.value = ''
  searchResults.value = []
  showSearchDropdown.value = false
  void nextTick(() => searchInputRef.value?.focus())
}

async function applyGiftCard() {
  giftMsg.value = ''
  const code = activeTab.value.giftCardCode.trim()
  if (!code) {
    giftMsg.value = 'Ingresa un código'
    return
  }
  const tab = activeTab.value
  giftLoading.value = true
  try {
    const { data } = await api.post<GiftCardPreview>('/gift-cards/preview', {
      code,
      amountDue: totalBeforeGift.value,
    })
    tab.giftCardCode = data.code
    tab.giftCardBalance = data.balance
    if (data.balance <= 0) giftMsg.value = 'La tarjeta de regalo no tiene saldo'
  } catch (e: unknown) {
    tab.giftCardBalance = 0
    giftMsg.value = apiError(e, 'No se pudo aplicar la tarjeta')
  } finally {
    giftLoading.value = false
  }
}

/** Si cambian el código ya validado, hay que volver a aplicarlo. */
function onGiftCodeInput() {
  activeTab.value.giftCardBalance = 0
  giftMsg.value = ''
}

function clearGiftCard() {
  activeTab.value.giftCardCode = ''
  activeTab.value.giftCardBalance = 0
  giftMsg.value = ''
}

function searchCustomers() {
  if (customerTimer) clearTimeout(customerTimer)
  customerMsg.value = ''
  const seq = ++customerSeq
  const q = customerQuery.value.trim()
  if (!q) {
    customerResults.value = []
    customerDropdownOpen.value = false
    return
  }
  customerTimer = setTimeout(() => void runCustomerSearch(q, seq), 200)
}

async function runCustomerSearch(q: string, seq: number) {
  try {
    const { data } = await api.get<Customer[]>('/customers', { params: { q } })
    if (seq !== customerSeq) return
    customerResults.value = data
    customerDropdownOpen.value = true
  } catch (e: unknown) {
    if (seq !== customerSeq) return
    customerResults.value = []
    customerDropdownOpen.value = false
    customerMsg.value = apiError(e, 'No se pudo buscar clientes')
  }
}

function closeCustomerDropdown() {
  customerDropdownOpen.value = false
}

function selectCustomer(c: Customer) {
  activeTab.value.customerId = c.id
  activeTab.value.customerLabel = c.phone ? `${c.name} (${c.phone})` : c.name
  customerQuery.value = ''
  customerResults.value = []
  customerDropdownOpen.value = false
  customerMsg.value = ''
  newCustomer.open = false
}

function clearCustomer() {
  activeTab.value.customerId = null
  activeTab.value.customerLabel = ''
}

/** Enter en el buscador: elige la primera coincidencia o abre el alta con lo escrito. */
async function createOrSelectCustomer() {
  const q = customerQuery.value.trim()
  if (!q) return
  if (customerTimer) clearTimeout(customerTimer)
  await runCustomerSearch(q, ++customerSeq)
  if (customerMsg.value) return
  if (customerResults.value[0]) {
    selectCustomer(customerResults.value[0])
    return
  }
  openNewCustomer()
}

function openNewCustomer() {
  const q = customerQuery.value.trim()
  const looksPhone = /^\+?\d[\d\s().-]{5,}$/.test(q)
  newCustomer.name = looksPhone ? '' : q
  newCustomer.phone = looksPhone ? q : ''
  newCustomer.open = true
  customerDropdownOpen.value = false
  customerMsg.value = ''
  void nextTick(() => newCustomerNameRef.value?.focus())
}

async function saveNewCustomer() {
  const name = newCustomer.name.trim()
  if (!name) {
    customerMsg.value = 'Escribe el nombre del cliente'
    return
  }
  customerMsg.value = ''
  newCustomer.saving = true
  try {
    const { data } = await api.post<Customer>('/customers', {
      name,
      phone: newCustomer.phone.trim() || null,
    })
    selectCustomer(data)
  } catch (e: unknown) {
    customerMsg.value = apiError(e, 'No se pudo guardar el cliente')
  } finally {
    newCustomer.saving = false
  }
}

function buildLinesPayload() {
  return activeTab.value.lines.map((l) => ({
    productId: l.productId,
    quantity: l.quantity,
    discount: num(l.discount),
    unitPrice: l.unitPrice,
  }))
}

async function confirmSale() {
  formError.value = ''
  successMsg.value = ''
  if (saving.value) return
  formError.value = cartError()
  if (formError.value) return
  if (activeTab.value.paymentMethod === 'MIXTO') {
    if (!mixedOk.value) {
      formError.value = 'Los montos del pago mixto deben sumar el total'
      return
    }
    if (mixedPayments().length < 2) {
      formError.value =
        'El pago mixto necesita montos en al menos dos formas de pago. Si es una sola, elígela arriba.'
      return
    }
  }
  if (cashShort.value > 0) {
    formError.value = `El efectivo recibido no cubre el total: faltan $${formatMoney(cashShort.value)}`
    return
  }

  const isSelf = activeTab.value.attendedById === SELF_ATTENDANT
  const payload: CreateSalePayload = {
    paymentMethod: activeTab.value.paymentMethod,
    applyTax: activeTab.value.applyTax,
    taxRate: 0.16,
    pricesIncludeTax: pricesIncludeIva.value,
    ticketComment: activeTab.value.ticketComment || null,
    attendedById: isSelf ? null : activeTab.value.attendedById || null,
    attendedByUserId: isSelf && auth.user ? auth.user.id : null,
    customerId: activeTab.value.customerId,
    giftCardCode: giftCardApplied.value > 0 ? activeTab.value.giftCardCode.trim() : null,
    lines: buildLinesPayload(),
    ...(activeTab.value.paymentMethod === 'MIXTO'
      ? { payments: mixedPayments() }
      : {}),
  }

  const change = changeDue.value
  const cashReceived = activeTab.value.paymentMethod === 'EFECTIVO' ? num(activeTab.value.cashReceived) : 0
  const tabId = activeTab.value.id
  saving.value = true
  try {
    const { data } = await api.post<Sale>('/sales', payload)
    successMsg.value =
      `Venta registrada · ticket #${data.ticketNumber} · total $${formatMoney(Number(data.total ?? 0))}` +
      (change > 0 ? ` · cambio $${formatMoney(change)}` : '')
    resetTab(tabId)
    giftMsg.value = ''
    searchMsg.value = ''
    newCustomer.open = false
    lastSale.value = { sale: data, cashReceived, change }
    // Con "Imprimir tickets" activo el ticket se abre solo, listo para imprimir o enviar.
    showTicket.value = prefs.value?.printTickets !== false
    if (!showTicket.value) void nextTick(() => searchInputRef.value?.focus())
  } catch (e: unknown) {
    formError.value = apiError(e, 'No se pudo confirmar la compra')
  } finally {
    saving.value = false
  }
}

async function createLayaway() {
  formError.value = ''
  successMsg.value = ''
  if (saving.value) return
  if (activeTab.value.lines.length === 0) {
    formError.value = 'Agrega productos para el apartado'
    return
  }
  formError.value = cartError()
  if (formError.value) return

  const payload: CreateLayawayPayload = {
    lines: buildLinesPayload(),
    applyTax: activeTab.value.applyTax,
    taxRate: 0.16,
    pricesIncludeTax: pricesIncludeIva.value,
    ticketComment: activeTab.value.ticketComment || null,
    customerId: activeTab.value.customerId,
  }

  const tabId = activeTab.value.id
  saving.value = true
  try {
    const { data } = await api.post<{ code: string }>('/layaways', payload)
    successMsg.value = `Apartado creado · código ${data.code}`
    resetTab(tabId)
    giftMsg.value = ''
    searchMsg.value = ''
    newCustomer.open = false
  } catch (e: unknown) {
    formError.value = apiError(e, 'No se pudo crear el apartado')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    if (!auth.user?.preferences) {
      await auth.fetchMe()
    }
    prefs.value = auth.user?.preferences ?? (await fetchPreferences())
  } catch {
    try {
      prefs.value = await fetchPreferences()
    } catch {
      prefs.value = null
    }
  }

  try {
    employees.value = await fetchEmployees(true)
  } catch {
    employees.value = []
  } finally {
    loadingEmployees.value = false
  }

  const chargeIva = !!prefs.value?.chargeIva
  for (const tab of tabs.value) {
    // Quien atendía pudo darse de baja desde que se guardó la sesión.
    const known =
      tab.attendedById === SELF_ATTENDANT || employees.value.some((e) => e.id === tab.attendedById)
    if (!known) tab.attendedById = employees.value[0]?.id || SELF_ATTENDANT
    // Las preferencias llegan después de crear la primera caja: una caja aún
    // vacía toma el "Cobrar IVA por defecto" del negocio.
    if (tab.lines.length === 0) tab.applyTax = chargeIva
  }
  void nextTick(() => searchInputRef.value?.focus())
})
</script>
