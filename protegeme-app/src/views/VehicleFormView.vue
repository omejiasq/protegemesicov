<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Calendar from 'primevue/calendar'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import { VehiclesserviceApi } from '../api/vehicles.service'

const props = defineProps<{
  id: string | null
}>()
const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'cancel'): void
}>()

const toast = useToast()
const loading = ref(false)

const form = reactive<any>({
  placa: '',
  clase: '',
  nivelServicio: '',
  estado: true,
  soat: { fechaVencimiento: '' },
  rtm:  { fechaVencimiento: '' },
  to:   { fechaVencimiento: '' },
})

const clases = ref([
  'Automóvil', 'Camión', 'Bus', 'Microbus', 'Moto', 'Otro'
])
const niveles = ref([
  'Particular', 'Público', 'Especial', 'Carga'
])

async function load() {
  if (!props.id) return
  loading.value = true
  try {
    const { data } = await VehiclesserviceApi.get(props.id)
    Object.assign(form, {
      placa: data?.placa ?? '',
      clase: data?.clase ?? '',
      nivelServicio: data?.nivelServicio ?? '',
      estado: data?.estado ?? true,
      soat: { fechaVencimiento: data?.soat?.fechaVencimiento || '' },
      rtm:  { fechaVencimiento: data?.rtm?.fechaVencimiento  || '' },
      to:   { fechaVencimiento: data?.to?.fechaVencimiento   || '' },
    })
  } finally {
    loading.value = false
  }
}

async function save() {
  loading.value = true
  try {
    const payload = {
      placa: form.placa?.trim(),
      clase: form.clase || null,
      nivelServicio: form.nivelServicio || null,
      estado: !!form.estado,
      soat: { fechaVencimiento: normalizeDate(form.soat?.fechaVencimiento) },
      rtm:  { fechaVencimiento: normalizeDate(form.rtm?.fechaVencimiento)  },
      to:   { fechaVencimiento: normalizeDate(form.to?.fechaVencimiento)   },
    }

    if (props.id) {
      await VehiclesserviceApi.update(props.id, payload)
      toast.add({ severity: 'success', summary: 'Guardado', detail: 'Vehículo actualizado', life: 2500 })
    } else {
      await VehiclesserviceApi.create(payload)
      toast.add({ severity: 'success', summary: 'Creado', detail: 'Vehículo creado', life: 2500 })
    }
    emit('saved')
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e?.response?.data?.message || 'Revisá los datos', life: 4000 })
  } finally {
    loading.value = false
  }
}

function cancel() {
  emit('cancel')
}

/** Acepta Date|string y devuelve YYYY-MM-DD (o '') */
function normalizeDate(v: any): string {
  if (!v) return ''
  if (typeof v === 'string') return v.slice(0, 10)
  try {
    const yyyy = v.getFullYear()
    const mm = String(v.getMonth() + 1).padStart(2, '0')
    const dd = String(v.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch { return '' }
}

onMounted(load)
watch(() => props.id, load)
</script>

<template>
  <div class="grid">
    <div class="col-12 md:col-6">
      <label class="block mb-2">Placa</label>
      <InputText v-model="form.placa" class="w-full" placeholder="ABC123" />
    </div>
    <div class="col-12 md:col-3">
      <label class="block mb-2">Clase</label>
      <Dropdown v-model="form.clase" :options="clases" placeholder="Seleccione" class="w-full" />
    </div>
    <div class="col-12 md:col-3">
      <label class="block mb-2">Nivel de Servicio</label>
      <Dropdown v-model="form.nivelServicio" :options="niveles" placeholder="Seleccione" class="w-full" />
    </div>

    <Divider class="col-12">Vencimientos</Divider>

    <div class="col-12 md:col-4">
      <label class="block mb-2">SOAT</label>
      <Calendar v-model="form.soat.fechaVencimiento" dateFormat="yy-mm-dd" class="w-full" showIcon />
    </div>
    <div class="col-12 md:col-4">
      <label class="block mb-2">RTM</label>
      <Calendar v-model="form.rtm.fechaVencimiento" dateFormat="yy-mm-dd" class="w-full" showIcon />
    </div>
    <div class="col-12 md:col-4">
      <label class="block mb-2">Tarjeta Operación</label>
      <Calendar v-model="form.to.fechaVencimiento" dateFormat="yy-mm-dd" class="w-full" showIcon />
    </div>

    <div class="col-12 mt-3 flex justify-content-end gap-2">
      <Button label="Cancelar" class="p-button-text" @click="cancel" :disabled="loading" />
      <Button :label="props.id ? 'Guardar' : 'Crear'" icon="pi pi-save" @click="save" :loading="loading" />
    </div>
  </div>
</template>
