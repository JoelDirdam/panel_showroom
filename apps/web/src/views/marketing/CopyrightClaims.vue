<template>
  <LegalPage title="Reclamos de derechos de autor" :updated="POLICIES_UPDATED">
    <p>
      En <strong>COSDI</strong> los negocios suben su propio contenido (logotipos, fotos de producto, textos). Si
      consideras que algo alojado en la plataforma usa una obra tuya sin autorización, avísanos por este canal.
      Revisamos cada aviso y, cuando procede, retiramos o bloqueamos el contenido y se lo notificamos al negocio que
      lo subió.
    </p>

    <h2>Qué necesitamos</h2>
    <ul>
      <li>Tu nombre y un correo para responderte.</li>
      <li>Quién es el titular del derecho (tú o a quien representas).</li>
      <li>Qué obra es y cómo podemos identificarla.</li>
      <li>Dónde está el contenido en COSDI: la dirección (URL) o una descripción precisa.</li>
      <li>Tu declaración de buena fe y de que la información es correcta, con tu nombre como firma.</li>
    </ul>
    <p>
      También puedes enviar el aviso por correo a
      <a :href="`mailto:${B.email}?subject=Reclamo%20de%20derechos%20de%20autor`">{{ B.email }}</a>
      con el asunto “Reclamo de derechos de autor”.
    </p>

    <h2>Enviar un aviso</h2>

    <div
      v-if="sentId"
      role="status"
      class="rounded-xl border border-success-200 bg-success-50 p-5 text-success-800 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300"
    >
      <p class="font-semibold">Recibimos tu aviso.</p>
      <p class="mt-1 text-sm">
        Tu folio es <strong>{{ sentId }}</strong>. Te enviamos un acuse al correo que indicaste y te responderemos por
        ese medio.
      </p>
    </div>

    <form v-else class="space-y-4" novalidate @submit.prevent="submit">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="cc-name" :class="labelCls">Tu nombre completo *</label>
          <input id="cc-name" v-model="form.claimantName" type="text" required autocomplete="name" :class="inputCls" />
        </div>
        <div>
          <label for="cc-email" :class="labelCls">Correo electrónico *</label>
          <input id="cc-email" v-model="form.claimantEmail" type="email" required autocomplete="email" :class="inputCls" />
        </div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="cc-phone" :class="labelCls">Teléfono (opcional)</label>
          <input id="cc-phone" v-model="form.claimantPhone" type="tel" autocomplete="tel" :class="inputCls" />
        </div>
        <div>
          <label for="cc-holder" :class="labelCls">Titular del derecho *</label>
          <input id="cc-holder" v-model="form.rightsHolder" type="text" required :class="inputCls" aria-describedby="cc-holder-help" />
          <p id="cc-holder-help" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Tu nombre, o el de la persona o empresa que representas.
          </p>
        </div>
      </div>
      <div>
        <label for="cc-work" :class="labelCls">Obra protegida *</label>
        <textarea id="cc-work" v-model="form.workDescription" rows="3" required :class="inputCls" aria-describedby="cc-work-help" />
        <p id="cc-work-help" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Describe la obra (por ejemplo, “fotografía de mi autoría publicada en…”) y, si existe, dónde puede verse el original.
        </p>
      </div>
      <div>
        <label for="cc-url" :class="labelCls">Dónde está el contenido en COSDI *</label>
        <textarea id="cc-url" v-model="form.infringingUrl" rows="2" required :class="inputCls" placeholder="https://cosdi.mx/…" />
      </div>
      <div>
        <label for="cc-details" :class="labelCls">Información adicional (opcional)</label>
        <textarea id="cc-details" v-model="form.details" rows="3" :class="inputCls" />
      </div>

      <div class="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.04]">
        <FormCheckbox v-model="form.goodFaith" required>
          Declaro de buena fe que el uso del contenido señalado no está autorizado por el titular del derecho, su
          representante o la ley.
        </FormCheckbox>
        <FormCheckbox v-model="form.accuracy" required>
          Declaro, bajo protesta de decir verdad, que la información de este aviso es correcta y que soy el titular
          del derecho o estoy autorizado para actuar en su nombre.
        </FormCheckbox>
      </div>

      <div>
        <label for="cc-signature" :class="labelCls">Firma: escribe tu nombre completo *</label>
        <input id="cc-signature" v-model="form.signature" type="text" required :class="inputCls" />
      </div>

      <p v-if="error" role="alert" class="text-sm text-error-500">{{ error }}</p>

      <button
        type="submit"
        :disabled="sending"
        class="ui-btn ui-btn-primary"
      >
        {{ sending ? 'Enviando…' : 'Enviar aviso' }}
      </button>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Usamos estos datos solo para atender tu aviso, conforme al
        <router-link to="/privacidad">aviso de privacidad</router-link>. Podemos compartir el contenido del aviso con
        el negocio que subió el material señalado.
      </p>
    </form>
  </LegalPage>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import LegalPage from '@/components/marketing/LegalPage.vue'
import FormCheckbox from '@/components/forms/FormCheckbox.vue'
import { BUSINESS as B } from '@/lib/business'
import { POLICIES_UPDATED } from '@/lib/legal'
import { extractApiError } from '@/services/api'
import { submitCopyrightClaim } from '@/services/compliance'

const labelCls = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'
const inputCls =
  'w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90'

const form = reactive({
  claimantName: '',
  claimantEmail: '',
  claimantPhone: '',
  rightsHolder: '',
  workDescription: '',
  infringingUrl: '',
  details: '',
  goodFaith: false,
  accuracy: false,
  signature: '',
})
const sending = ref(false)
const error = ref<string | null>(null)
const sentId = ref<string | null>(null)

async function submit() {
  error.value = null
  if (
    !form.claimantName.trim() ||
    !form.claimantEmail.trim() ||
    !form.rightsHolder.trim() ||
    form.workDescription.trim().length < 10 ||
    form.infringingUrl.trim().length < 5 ||
    !form.signature.trim()
  ) {
    error.value = 'Completa los campos marcados con * (la descripción de la obra debe tener al menos 10 caracteres).'
    return
  }
  if (!form.goodFaith || !form.accuracy) {
    error.value = 'Marca las dos declaraciones para poder enviar el aviso.'
    return
  }
  sending.value = true
  try {
    const { id } = await submitCopyrightClaim({
      ...form,
      claimantPhone: form.claimantPhone.trim() || null,
      details: form.details.trim() || null,
    })
    sentId.value = id
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo enviar el aviso. Intenta de nuevo o escríbenos por correo.')
  } finally {
    sending.value = false
  }
}
</script>
