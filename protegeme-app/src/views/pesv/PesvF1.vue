<template>
  <div class="f1-view">

    <!-- Header fijo -->
    <div class="f1-header">
      <div class="f1-header-left">
        <h2 class="f1-title">Formulario 1 — PESV Anual</h2>
        <span class="f1-subtitle">Resolución 40595 de 2015 · Año 2026 · {{ empresaNombre }}</span>
      </div>
      <div class="f1-header-right">
        <div class="global-progress-wrap">
          <span class="global-pct">{{ pctGlobal }}% completado</span>
          <ProgressBar :value="pctGlobal" style="height:10px;width:200px"
            :class="pctGlobal >= 80 ? 'pb-green' : 'pb-yellow'" />
        </div>
        <Button label="Guardar borrador" icon="pi pi-save" outlined size="small" @click="guardarBorrador" />
        <Button label="Enviar F1" icon="pi pi-send" size="small" :disabled="pctGlobal < 80" @click="enviarF1" />
      </div>
    </div>

    <!-- Tabs de secciones -->
    <div class="f1-tabs">
      <button v-for="(sec, i) in secciones" :key="i"
        class="f1-tab" :class="{ 'f1-tab-active': paso === i, 'f1-tab-done': seccionCompleta(i) }"
        @click="paso = i">
        <span class="tab-num">{{ i + 1 }}</span>
        <span class="tab-label">{{ sec.titulo }}</span>
        <i v-if="seccionCompleta(i)" class="pi pi-check-circle tab-check"></i>
      </button>
    </div>

    <!-- Leyenda -->
    <div class="f1-leyenda">
      <span class="ley-item"><span class="dot dot-auto"></span> Auto-completado desde el sistema</span>
      <span class="ley-item"><span class="dot dot-manual"></span> Requiere completar</span>
      <span class="ley-item"><i class="pi pi-microphone" style="color:#8b5cf6;font-size:0.75rem"></i> Puede dictar la respuesta</span>
    </div>

    <!-- Contenido de cada sección -->
    <div class="f1-body">

      <!-- ── SECCIÓN 0: Datos generales ── -->
      <div v-if="paso === 0" class="seccion">
        <h3 class="seccion-titulo"><i class="pi pi-building mr-2"></i>Datos Generales de la Empresa</h3>

        <div class="campos-grid">
          <CampoF1 label="Razón Social" :valor="form.razonSocial" :auto="true"
            fuente="Configuración empresa" @update="form.razonSocial = $event" />
          <CampoF1 label="NIT" :valor="form.nit" :auto="true"
            fuente="Configuración empresa" @update="form.nit = $event" />
          <CampoF1 label="Tipo de habilitación" :valor="form.tipoHabilitacion" :auto="true"
            fuente="Configuración empresa" tipo="select"
            :opciones="['CARRETERA','ESPECIAL','MIXTO','URBANO']"
            @update="form.tipoHabilitacion = $event" />
          <CampoF1 label="Municipio / Ciudad" :valor="form.municipio" :auto="false"
            :voz="true" @update="form.municipio = $event" />
          <CampoF1 label="Dirección" :valor="form.direccion" :auto="false"
            :voz="true" @update="form.direccion = $event" />
          <CampoF1 label="Teléfono" :valor="form.telefono" :auto="false"
            :voz="true" @update="form.telefono = $event" />
          <CampoF1 label="Representante Legal" :valor="form.representante" :auto="false"
            :voz="true" @update="form.representante = $event" />
          <CampoF1 label="Responsable PESV" :valor="form.responsablePesv" :auto="false"
            :voz="true" @update="form.responsablePesv = $event" />
          <CampoF1 label="N.° total de empleados" :valor="form.totalEmpleados" :auto="false"
            tipo="number" :voz="true" @update="form.totalEmpleados = $event" />
          <CampoF1 label="N.° de conductores" :valor="form.totalConductores" :auto="true"
            fuente="Módulo Conductores (6 registrados)" @update="form.totalConductores = $event" />
          <CampoF1 label="N.° de vehículos" :valor="form.totalVehiculos" :auto="true"
            fuente="Módulo Vehículos (5 registrados)" @update="form.totalVehiculos = $event" />
          <CampoF1 label="Código de habilitación RUNT" :valor="form.codigoHabilitacion" :auto="false"
            :voz="true" @update="form.codigoHabilitacion = $event" />
        </div>
      </div>

      <!-- ── SECCIÓN 1: Política ── -->
      <div v-if="paso === 1" class="seccion">
        <h3 class="seccion-titulo"><i class="pi pi-shield mr-2"></i>Política de Seguridad Vial</h3>
        <p class="seccion-desc">La política de seguridad vial debe estar documentada, firmada por la alta dirección y socializada con todos los colaboradores (Art. 4, Res. 40595/2015).</p>

        <div class="preguntas-lista">
          <PreguntaF1 v-for="(p, i) in preguntasPolitica" :key="i" :pregunta="p"
            @update="p.respuesta = $event; p.obs = $event.obs" />
        </div>

        <div class="obs-block">
          <label class="obs-label">Texto de la Política de Seguridad Vial (resumen)</label>
          <div class="textarea-voz-wrap">
            <Textarea v-model="form.textoPolitica" rows="4" class="w-full"
              placeholder="Dicte o escriba el resumen de la política de seguridad vial de la empresa..." />
            <Button icon="pi pi-microphone" rounded text
              :class="escuchandoPolitica ? 'mic-active' : ''"
              @click="toggleVoz('politica')" v-tooltip.top="'Dictar texto'" />
          </div>
          <span v-if="escuchandoPolitica" class="mic-status">🔴 Escuchando... hable ahora</span>
        </div>
      </div>

      <!-- ── SECCIÓN 2: Gestión Institucional ── -->
      <div v-if="paso === 2" class="seccion">
        <h3 class="seccion-titulo"><i class="pi pi-sitemap mr-2"></i>Línea 1 — Gestión Institucional</h3>
        <p class="seccion-desc">Estructura organizacional del PESV: responsable designado, diagnóstico de riesgo, plan de acción y comunicación a terceros.</p>
        <div class="preguntas-lista">
          <PreguntaF1 v-for="(p, i) in preguntasGestion" :key="i" :pregunta="p"
            @update="p.respuesta = $event" />
        </div>
      </div>

      <!-- ── SECCIÓN 3: Comportamiento Humano ── -->
      <div v-if="paso === 3" class="seccion">
        <h3 class="seccion-titulo"><i class="pi pi-users mr-2"></i>Línea 2 — Comportamiento Humano</h3>
        <p class="seccion-desc">Control y seguimiento del comportamiento de los conductores: alcoholemia, jornadas, capacitaciones, evaluación de hábitos.</p>
        <div class="info-auto-banner">
          <i class="pi pi-info-circle"></i>
          <span>Esta sección se completó <strong>85% automáticamente</strong> con datos del módulo de Alcoholemia, Horas Conducidas y Capacitaciones de ProtegeMe.</span>
        </div>
        <div class="preguntas-lista">
          <PreguntaF1 v-for="(p, i) in preguntasComportamiento" :key="i" :pregunta="p"
            @update="p.respuesta = $event" />
        </div>
      </div>

      <!-- ── SECCIÓN 4: Vehículos Seguros ── -->
      <div v-if="paso === 4" class="seccion">
        <h3 class="seccion-titulo"><i class="pi pi-car mr-2"></i>Línea 3 — Vehículos Seguros</h3>
        <p class="seccion-desc">Estado de los vehículos, alistamientos, mantenimientos, documentación vehicular y equipos de seguridad.</p>
        <div class="info-auto-banner">
          <i class="pi pi-info-circle"></i>
          <span>Esta sección se completó <strong>92% automáticamente</strong> con datos de Alistamientos, Mantenimientos y Gestión de Vehículos de ProtegeMe.</span>
        </div>
        <div class="preguntas-lista">
          <PreguntaF1 v-for="(p, i) in preguntasVehiculos" :key="i" :pregunta="p"
            @update="p.respuesta = $event" />
        </div>
      </div>

      <!-- ── SECCIÓN 5: Infra + Atención ── -->
      <div v-if="paso === 5" class="seccion">
        <h3 class="seccion-titulo"><i class="pi pi-map mr-2"></i>Líneas 4 y 5 — Infraestructura y Atención a Víctimas</h3>
        <div class="preguntas-lista">
          <PreguntaF1 v-for="(p, i) in preguntasInfraAtencion" :key="i" :pregunta="p"
            @update="p.respuesta = $event" />
        </div>
      </div>

      <!-- ── SECCIÓN 6: Resumen y envío ── -->
      <div v-if="paso === 6" class="seccion">
        <h3 class="seccion-titulo"><i class="pi pi-check-square mr-2"></i>Resumen y Confirmación</h3>

        <div class="resumen-grid">
          <div v-for="(sec, i) in secciones.slice(0, 6)" :key="i" class="resumen-card"
            :class="seccionCompleta(i) ? 'card-ok' : 'card-pendiente'">
            <div class="resumen-card-header">
              <span class="resumen-sec-num">Sección {{ i + 1 }}</span>
              <Tag :value="seccionCompleta(i) ? 'Completa' : 'Incompleta'"
                :severity="seccionCompleta(i) ? 'success' : 'warn'" />
            </div>
            <span class="resumen-sec-title">{{ sec.titulo }}</span>
            <div class="resumen-stats">
              <span>{{ contarRespondidas(i) }} / {{ contarTotal(i) }} preguntas</span>
              <span class="resumen-auto" v-if="contarAuto(i) > 0">
                <i class="pi pi-bolt"></i> {{ contarAuto(i) }} auto-completadas
              </span>
            </div>
            <Button v-if="!seccionCompleta(i)" label="Completar" link size="small" @click="paso = i" />
          </div>
        </div>

        <div class="firma-section">
          <h4>Firma del Responsable PESV</h4>
          <div class="firma-box">
            <span class="firma-placeholder">
              <i class="pi pi-pencil"></i>
              {{ form.responsablePesv || 'Nombre del Responsable PESV' }}
            </span>
            <span class="firma-fecha">Fecha: {{ fechaHoy }}</span>
          </div>
          <p class="firma-desc">Al enviar, confirma que la información diligenciada es verídica y corresponde a la operación de la empresa durante el período 2026.</p>
        </div>

        <div class="acciones-finales">
          <Button label="Descargar PDF borrador" icon="pi pi-file-pdf" outlined severity="secondary" @click="descargarPDF" />
          <Button label="Enviar Formulario 1 a Supertransporte" icon="pi pi-send" severity="success"
            :disabled="pctGlobal < 80" @click="enviarF1" />
        </div>
      </div>

    </div>

    <!-- Navegación inferior -->
    <div class="f1-nav">
      <Button v-if="paso > 0" label="Anterior" icon="pi pi-arrow-left" outlined @click="paso--" />
      <span class="nav-indicador">{{ paso + 1 }} / {{ secciones.length }}</span>
      <Button v-if="paso < secciones.length - 1" label="Siguiente" icon="pi pi-arrow-right" iconPos="right" @click="paso++" />
      <Button v-else label="Ver resumen" icon="pi pi-check" severity="success" @click="paso = 6" />
    </div>

    <Toast />
  </div>
</template>

<!-- ─────────────────── COMPONENTE INTERNO: Campo ─────────────────── -->
<script lang="ts">
import { defineComponent, ref, computed, h, PropType } from 'vue'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Tag from 'primevue/tag'

// ── CampoF1 ──────────────────────────────────────────────────────────
export const CampoF1 = defineComponent({
  name: 'CampoF1',
  props: {
    label:   { type: String, required: true },
    valor:   { type: String, default: '' },
    auto:    { type: Boolean, default: false },
    fuente:  { type: String, default: '' },
    tipo:    { type: String, default: 'text' },  // text | number | select
    opciones:{ type: Array as PropType<string[]>, default: () => [] },
    voz:     { type: Boolean, default: false },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const local = ref(props.valor)
    const escuchando = ref(false)

    function iniciarVoz() {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRec) { alert('Su navegador no soporta reconocimiento de voz. Use Chrome.'); return }
      const rec = new SpeechRec()
      rec.lang = 'es-CO'
      rec.interimResults = false
      rec.maxAlternatives = 1
      escuchando.value = true
      rec.start()
      rec.onresult = (e: any) => {
        local.value = e.results[0][0].transcript
        emit('update', local.value)
        escuchando.value = false
      }
      rec.onerror = () => { escuchando.value = false }
      rec.onend   = () => { escuchando.value = false }
    }

    return () => {
      const isAuto = props.auto && props.valor
      return h('div', { class: `campo-f1 ${isAuto ? 'campo-auto' : 'campo-manual'}` }, [
        h('div', { class: 'campo-header' }, [
          h('label', { class: 'campo-label' }, props.label),
          isAuto
            ? h('span', { class: 'badge-auto' }, [h('i', { class: 'pi pi-bolt mr-1' }), 'Auto'])
            : h('span', { class: 'badge-manual' }, 'Completar'),
        ]),
        // Input
        props.tipo === 'select'
          ? h(Select, {
              modelValue: local.value,
              options: props.opciones,
              class: 'w-full campo-input',
              disabled: isAuto,
              'onUpdate:modelValue': (v: string) => { local.value = v; emit('update', v) },
            })
          : h('div', { class: 'input-voz-row' }, [
              h(InputText, {
                modelValue: local.value,
                type: props.tipo === 'number' ? 'number' : 'text',
                class: `w-full campo-input ${isAuto ? 'input-auto' : ''}`,
                readonly: isAuto,
                placeholder: isAuto ? '' : `Ingrese ${props.label.toLowerCase()}...`,
                'onUpdate:modelValue': (v: string) => { local.value = v; emit('update', v) },
              }),
              !isAuto && props.voz
                ? h(Button, {
                    icon: escuchando.value ? 'pi pi-stop' : 'pi pi-microphone',
                    rounded: true, text: true,
                    class: escuchando.value ? 'mic-active' : '',
                    title: 'Dictar respuesta',
                    onClick: iniciarVoz,
                  })
                : null,
            ]),
        // Fuente
        isAuto && props.fuente
          ? h('span', { class: 'campo-fuente' }, [h('i', { class: 'pi pi-database mr-1' }), props.fuente])
          : null,
        escuchando.value
          ? h('span', { class: 'mic-status' }, '🔴 Escuchando...')
          : null,
      ])
    }
  },
})

// ── PreguntaF1 ───────────────────────────────────────────────────────
export const PreguntaF1 = defineComponent({
  name: 'PreguntaF1',
  props: {
    pregunta: { type: Object as PropType<any>, required: true },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const local = ref(props.pregunta.respuesta ?? null)
    const obsLocal = ref(props.pregunta.obs ?? '')
    const escuchando = ref(false)

    function setResp(v: string) {
      local.value = v
      emit('update', { valor: v, obs: obsLocal.value })
    }

    function iniciarVozObs() {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRec) { alert('Su navegador no soporta reconocimiento de voz. Use Chrome.'); return }
      const rec = new SpeechRec()
      rec.lang = 'es-CO'; rec.interimResults = false
      escuchando.value = true
      rec.start()
      rec.onresult = (e: any) => {
        obsLocal.value = e.results[0][0].transcript
        emit('update', { valor: local.value, obs: obsLocal.value })
        escuchando.value = false
      }
      rec.onerror = () => { escuchando.value = false }
      rec.onend   = () => { escuchando.value = false }
    }

    return () => {
      const p = props.pregunta
      const isAuto = p.autoRespuesta && local.value !== null

      return h('div', { class: `pregunta-f1 ${isAuto ? 'pregunta-auto' : ''}` }, [
        // Cabecera
        h('div', { class: 'pregunta-header' }, [
          h('span', { class: 'pregunta-num' }, p.num),
          h('span', { class: 'pregunta-texto' }, p.texto),
          isAuto ? h('span', { class: 'badge-auto' }, [h('i', { class: 'pi pi-bolt mr-1' }), 'Auto']) : null,
        ]),

        // Fuente auto
        isAuto && p.fuente
          ? h('div', { class: 'pregunta-fuente' }, [h('i', { class: 'pi pi-database mr-1' }), p.fuente])
          : null,

        // Botones Sí/No/N.A o texto libre
        p.tipo === 'sino'
          ? h('div', { class: 'sino-group' }, [
              ['Sí', 'No', 'N/A'].map(op =>
                h('button', {
                  class: `sino-btn ${local.value === op ? 'sino-active-' + (op === 'Sí' ? 'si' : op === 'No' ? 'no' : 'na') : ''}`,
                  onClick: () => setResp(op),
                }, op)
              ),
            ])
          : h('div', { class: 'input-voz-row' }, [
              h('input', {
                type: 'text',
                class: 'campo-input w-full',
                value: local.value ?? '',
                placeholder: 'Ingrese el dato...',
                onInput: (e: any) => setResp(e.target.value),
              }),
            ]),

        // Observación + voz (solo si respondió Sí o No)
        local.value && p.tipo === 'sino'
          ? h('div', { class: 'obs-row' }, [
              h('input', {
                type: 'text',
                class: 'campo-input obs-input',
                value: obsLocal.value,
                placeholder: 'Observación o evidencia (opcional) — puede dictar...',
                onInput: (e: any) => { obsLocal.value = e.target.value; emit('update', { valor: local.value, obs: obsLocal.value }) },
              }),
              h(Button, {
                icon: escuchando.value ? 'pi pi-stop' : 'pi pi-microphone',
                rounded: true, text: true, size: 'small',
                class: escuchando.value ? 'mic-active' : '',
                title: 'Dictar observación',
                onClick: iniciarVozObs,
              }),
              escuchando.value ? h('span', { class: 'mic-status' }, '🔴 Escuchando...') : null,
            ])
          : null,
      ])
    }
  },
})
</script>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../../stores/authStore'

const toast = useToast()
const auth  = useAuthStore()
const paso  = ref(0)
const empresaNombre = computed(() => auth.user?.nombre ?? 'ProtegeMe Demo S.A.S.')
const fechaHoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
const escuchandoPolitica = ref(false)

// ── Datos del formulario ──────────────────────────────────────────────
const form = ref({
  razonSocial:       'ProtegeMe Demo S.A.S.',
  nit:               '901.234.567-8',
  tipoHabilitacion:  'CARRETERA',
  municipio:         '',
  direccion:         '',
  telefono:          '',
  representante:     '',
  responsablePesv:   '',
  totalEmpleados:    '',
  totalConductores:  '6',
  totalVehiculos:    '5',
  codigoHabilitacion:'',
  textoPolitica:     '',
})

// ── Preguntas ─────────────────────────────────────────────────────────
const preguntasPolitica = ref([
  { num: '1.1', texto: '¿La empresa tiene una Política de Seguridad Vial documentada y vigente?', tipo: 'sino', respuesta: 'Sí', obs: 'Política aprobada en enero 2026 por Junta Directiva', autoRespuesta: false, fuente: '' },
  { num: '1.2', texto: '¿La política está firmada por el representante legal o la alta dirección?', tipo: 'sino', respuesta: 'Sí', obs: 'Firmada por el Gerente General', autoRespuesta: false, fuente: '' },
  { num: '1.3', texto: '¿Se ha socializado la política con todos los colaboradores de la empresa?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
  { num: '1.4', texto: '¿Está disponible la política para consulta de todos los empleados?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
])

const preguntasGestion = ref([
  { num: '2.1', texto: '¿Existe un responsable del PESV designado formalmente?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
  { num: '2.2', texto: '¿Se ha realizado un diagnóstico de seguridad vial en el último año?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
  { num: '2.3', texto: '¿Se tiene un plan de acción con metas, responsables y cronograma?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
  { num: '2.4', texto: '¿Se comunica el PESV a proveedores, contratistas y visitantes?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
  { num: '2.5', texto: '¿Se realizan auditorías internas periódicas al PESV?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
  { num: '2.6', texto: '¿La alta dirección revisa el PESV al menos una vez al año?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
])

const preguntasComportamiento = ref([
  { num: '3.1', texto: '¿Se realizan pruebas de alcoholemia preventivas antes de iniciar turno?', tipo: 'sino', respuesta: 'Sí', obs: '24 pruebas realizadas en Marzo 2026 · 1 resultado positivo con bloqueo automático', autoRespuesta: true, fuente: 'Módulo Alcoholemia BLE — ProtegeMe (Marzo 2026: 24 pruebas)' },
  { num: '3.2', texto: '¿Se controlan y registran las horas de conducción de cada conductor?', tipo: 'sino', respuesta: 'Sí', obs: 'Control de jornadas activo. 1 alerta de jornada extendida registrada.', autoRespuesta: true, fuente: 'Módulo Horas Conducidas — ProtegeMe (semana 24-30 Mar: 6 conductores)' },
  { num: '3.3', texto: '¿Se registra el inicio y fin de turno de cada conductor?', tipo: 'sino', respuesta: 'Sí', obs: 'Check-in y check-out facial biométrico en app móvil', autoRespuesta: true, fuente: 'App Móvil ProtegeMe — Control de turno con reconocimiento facial' },
  { num: '3.4', texto: '¿Se realizan capacitaciones en seguridad vial al menos 2 veces al año?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
  { num: '3.5', texto: '¿Se evalúan los hábitos y comportamiento de conducción de los conductores?', tipo: 'sino', respuesta: 'Sí', obs: 'Score promedio de flota: 74/100. Ranking semanal disponible.', autoRespuesta: true, fuente: 'Módulo Hábitos de Conducción — ProtegeMe (tracking GPS + acelerómetro)' },
  { num: '3.6', texto: '¿Se tienen registros de antecedentes de tránsito de los conductores?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
  { num: '3.7', texto: '¿Se verifica la vigencia de la licencia de conducción de cada conductor?', tipo: 'sino', respuesta: 'Sí', obs: 'Alertas de vencimiento de licencias activas en el sistema', autoRespuesta: true, fuente: 'Módulo Gestión Conductores — ProtegeMe (alertas a 30/15/5 días)' },
  { num: '3.8', texto: '¿Existe protocolo para casos de alcohol positivo o fatiga del conductor?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
])

const preguntasVehiculos = ref([
  { num: '4.1', texto: '¿Se realizan alistamientos diarios antes de iniciar operaciones?', tipo: 'sino', respuesta: 'Sí', obs: '98% de alistamientos completados en Marzo 2026 (98 de 100 programados)', autoRespuesta: true, fuente: 'Módulo Alistamiento — ProtegeMe (Marzo 2026)' },
  { num: '4.2', texto: '¿Se tiene un programa de mantenimiento preventivo para todos los vehículos?', tipo: 'sino', respuesta: 'Sí', obs: '93% de cumplimiento. OTs digitales generadas por el sistema.', autoRespuesta: true, fuente: 'Módulo Mantenimiento Preventivo — ProtegeMe (Marzo 2026)' },
  { num: '4.3', texto: '¿Todos los vehículos tienen SOAT vigente?', tipo: 'sino', respuesta: 'Sí', obs: '5/5 vehículos con SOAT vigente. Próximo vencimiento: Jun 2026.', autoRespuesta: true, fuente: 'Módulo Gestión Vehículos — ProtegeMe (alertas de vencimiento activas)' },
  { num: '4.4', texto: '¿Todos los vehículos tienen RTM (Revisión Técnico Mecánica) vigente?', tipo: 'sino', respuesta: 'Sí', obs: '5/5 vehículos con RTM vigente.', autoRespuesta: true, fuente: 'Módulo Gestión Vehículos — ProtegeMe' },
  { num: '4.5', texto: '¿Se verifica el kit de carretera (botiquín, extintor, triángulos) en cada alistamiento?', tipo: 'sino', respuesta: 'Sí', obs: 'Ítems de equipo de carretera incluidos en el check-list de alistamiento (códigos SICOV 10-11)', autoRespuesta: true, fuente: 'Módulo Alistamiento — ítems obligatorios configurados' },
  { num: '4.6', texto: '¿Se registran y hacen seguimiento a los mantenimientos correctivos?', tipo: 'sino', respuesta: 'Sí', obs: 'OTs de mantenimiento correctivo digitales con evidencia fotográfica.', autoRespuesta: true, fuente: 'Módulo Mantenimiento Correctivo — ProtegeMe' },
  { num: '4.7', texto: '¿Se controla el uso del cinturón de seguridad por parte de los conductores?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
])

const preguntasInfraAtencion = ref([
  { num: '5.1', texto: '¿Se tienen identificadas y documentadas las rutas que operan los vehículos?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
  { num: '5.2', texto: '¿Se realiza evaluación de riesgos de las rutas (zonas peligrosas, estado de vías)?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
  { num: '5.3', texto: '¿Se tienen definidas zonas seguras de parqueo y mantenimiento?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
  { num: '5.4', texto: '¿Existe un protocolo de atención a víctimas de accidente de tránsito?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
  { num: '5.5', texto: '¿Se tienen registrados contactos de emergencia (ambulancias, ARL, hospitales)?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
  { num: '5.6', texto: '¿Se registran y analizan todos los incidentes y accidentes de tránsito ocurridos?', tipo: 'sino', respuesta: 'Sí', obs: 'Módulo de incidentes activo. 0 incidentes en Marzo 2026.', autoRespuesta: true, fuente: 'Módulo Incidentes — ProtegeMe (sin incidentes en el período)' },
  { num: '5.7', texto: '¿Se generan reportes para la ARL cuando ocurre un accidente de trabajo en vía?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
  { num: '5.8', texto: '¿Se realizan simulacros de atención a emergencias viales?', tipo: 'sino', respuesta: null, obs: '', autoRespuesta: false, fuente: '' },
])

// ── Secciones (para tabs y navegación) ───────────────────────────────
const secciones = [
  { titulo: 'Datos Generales' },
  { titulo: 'Política SV' },
  { titulo: 'Gestión Inst.' },
  { titulo: 'Comp. Humano' },
  { titulo: 'Vehículos' },
  { titulo: 'Infra. y Atención' },
  { titulo: 'Resumen' },
]

// ── Helpers de completitud ────────────────────────────────────────────
function getCamposSeccion(i: number): string[] {
  if (i === 0) return Object.values(form.value).filter(v => typeof v === 'string') as string[]
  return []
}
function getPreguntasSeccion(i: number) {
  return [null, preguntasPolitica, preguntasGestion, preguntasComportamiento, preguntasVehiculos, preguntasInfraAtencion][i]?.value ?? []
}
function contarRespondidas(i: number) {
  if (i === 0) return Object.values(form.value).filter(v => v && String(v).trim()).length
  return getPreguntasSeccion(i).filter((p: any) => p.respuesta !== null && p.respuesta !== '').length
}
function contarTotal(i: number) {
  if (i === 0) return Object.keys(form.value).length
  return getPreguntasSeccion(i).length
}
function contarAuto(i: number) {
  if (i === 0) return 3 // razonSocial, nit, conductores, vehículos
  return getPreguntasSeccion(i).filter((p: any) => p.autoRespuesta).length
}
function seccionCompleta(i: number) {
  return contarRespondidas(i) >= contarTotal(i) * 0.7
}

const totalRespondidas = computed(() => {
  let t = 0
  for (let i = 0; i <= 5; i++) t += contarRespondidas(i)
  return t
})
const totalPreguntas = computed(() => {
  let t = 0
  for (let i = 0; i <= 5; i++) t += contarTotal(i)
  return t
})
const pctGlobal = computed(() => Math.min(100, Math.round((totalRespondidas.value / totalPreguntas.value) * 100)))

// ── Voz para textarea ────────────────────────────────────────────────
function toggleVoz(campo: string) {
  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRec) { toast.add({ severity: 'warn', summary: 'Voz no disponible', detail: 'Use Google Chrome para reconocimiento de voz', life: 3000 }); return }
  const rec = new SpeechRec()
  rec.lang = 'es-CO'; rec.interimResults = false; rec.maxAlternatives = 1
  escuchandoPolitica.value = true
  rec.start()
  rec.onresult = (e: any) => {
    if (campo === 'politica') form.value.textoPolitica += (form.value.textoPolitica ? ' ' : '') + e.results[0][0].transcript
    escuchandoPolitica.value = false
  }
  rec.onerror = () => { escuchandoPolitica.value = false }
  rec.onend   = () => { escuchandoPolitica.value = false }
}

function guardarBorrador() {
  toast.add({ severity: 'info', summary: 'Borrador guardado', detail: 'F1 guardado localmente. Puede continuar después.', life: 3000 })
}
function descargarPDF() {
  toast.add({ severity: 'success', summary: 'PDF generado', detail: 'Formulario 1 en PDF listo para revisar antes de enviar', life: 3000 })
}
function enviarF1() {
  if (pctGlobal.value < 80) {
    toast.add({ severity: 'warn', summary: 'Formulario incompleto', detail: `Complete al menos el 80% del formulario (actual: ${pctGlobal.value}%)`, life: 4000 }); return
  }
  toast.add({ severity: 'success', summary: '¡Formulario 1 enviado!', detail: 'F1 enviado a Supertransporte exitosamente. Número de radicado: PESV-2026-00471', life: 5000 })
}
</script>

<style scoped>
.f1-view { display: flex; flex-direction: column; min-height: 100vh; background: #f1f5f9; }

/* ── Header ── */
.f1-header {
  background: #1e3a5f; color: white; padding: 1rem 1.5rem;
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;
  position: sticky; top: 0; z-index: 10;
}
.f1-title  { font-size: 1.2rem; font-weight: 700; margin: 0; }
.f1-subtitle { font-size: 0.8rem; color: rgba(255,255,255,0.65); }
.f1-header-right { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.global-progress-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.global-pct { font-size: 0.8rem; color: rgba(255,255,255,0.8); }
:deep(.pb-green .p-progressbar-value)  { background: #22c55e !important; }
:deep(.pb-yellow .p-progressbar-value) { background: #f59e0b !important; }

/* ── Tabs ── */
.f1-tabs {
  display: flex; gap: 0; background: white; border-bottom: 2px solid #e2e8f0;
  overflow-x: auto; padding: 0 1rem;
}
.f1-tab {
  display: flex; align-items: center; gap: 0.4rem; padding: 0.75rem 1rem;
  border: none; background: none; cursor: pointer; color: #64748b; font-size: 0.82rem;
  border-bottom: 3px solid transparent; margin-bottom: -2px; white-space: nowrap;
  transition: all 0.2s;
}
.f1-tab:hover { color: #1e3a5f; }
.f1-tab-active { color: #1e3a5f; border-bottom-color: #1e3a5f; font-weight: 600; }
.f1-tab-done { color: #22c55e; }
.tab-num { width: 20px; height: 20px; border-radius: 50%; background: #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; }
.f1-tab-active .tab-num { background: #1e3a5f; color: white; }
.f1-tab-done .tab-num   { background: #22c55e; color: white; }
.tab-check { font-size: 0.75rem; color: #22c55e; }

/* ── Leyenda ── */
.f1-leyenda { display: flex; gap: 1.5rem; padding: 0.6rem 1.5rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; }
.ley-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: #64748b; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.dot-auto   { background: #22c55e; }
.dot-manual { background: #f59e0b; }

/* ── Body ── */
.f1-body { flex: 1; padding: 1.5rem; }
.seccion { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 6px rgba(0,0,0,0.07); }
.seccion-titulo { font-size: 1.1rem; font-weight: 700; color: #1e3a5f; margin: 0 0 0.5rem; display: flex; align-items: center; }
.seccion-desc { font-size: 0.85rem; color: #64748b; margin: 0 0 1.5rem; }

/* ── CamposGrid ── */
.campos-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.2rem; }

/* ── Estilos globales para CampoF1 y PreguntaF1 (deep) ── */
:global(.campo-f1) {
  display: flex; flex-direction: column; gap: 0.4rem;
}
:global(.campo-auto) { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.75rem; }
:global(.campo-manual) { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; }
:global(.campo-header) { display: flex; justify-content: space-between; align-items: center; }
:global(.campo-label) { font-size: 0.82rem; font-weight: 600; color: #334155; }
:global(.badge-auto) { background: #dcfce7; color: #166534; font-size: 0.7rem; padding: 2px 7px; border-radius: 12px; font-weight: 600; }
:global(.badge-manual) { background: #fef3c7; color: #92400e; font-size: 0.7rem; padding: 2px 7px; border-radius: 12px; font-weight: 600; }
:global(.campo-input) { font-size: 0.88rem !important; }
:global(.input-auto) { background: #f0fdf4 !important; color: #166534 !important; border-color: #86efac !important; font-weight: 600 !important; }
:global(.input-voz-row) { display: flex; align-items: center; gap: 0.3rem; }
:global(.campo-fuente) { font-size: 0.72rem; color: #22c55e; display: flex; align-items: center; }
:global(.mic-active) { color: #ef4444 !important; animation: pulse 1s infinite; }
:global(.mic-status) { font-size: 0.75rem; color: #ef4444; font-weight: 600; }

/* ── Preguntas ── */
.preguntas-lista { display: flex; flex-direction: column; gap: 0.75rem; }
:global(.pregunta-f1) {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem;
}
:global(.pregunta-auto) { background: #f0fdf4 !important; border-color: #bbf7d0 !important; }
:global(.pregunta-header) { display: flex; align-items: flex-start; gap: 0.6rem; margin-bottom: 0.6rem; }
:global(.pregunta-num) { font-size: 0.75rem; font-weight: 700; color: #64748b; white-space: nowrap; padding-top: 2px; }
:global(.pregunta-texto) { font-size: 0.88rem; color: #1e293b; flex: 1; }
:global(.pregunta-fuente) { font-size: 0.72rem; color: #22c55e; display: flex; align-items: center; margin-bottom: 0.5rem; }
:global(.sino-group) { display: flex; gap: 0.5rem; }
:global(.sino-btn) {
  padding: 0.35rem 1.1rem; border-radius: 20px; border: 1.5px solid #cbd5e1;
  background: white; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: #475569;
  transition: all 0.15s;
}
:global(.sino-btn:hover) { border-color: #94a3b8; }
:global(.sino-active-si) { background: #22c55e !important; border-color: #22c55e !important; color: white !important; }
:global(.sino-active-no) { background: #ef4444 !important; border-color: #ef4444 !important; color: white !important; }
:global(.sino-active-na) { background: #94a3b8 !important; border-color: #94a3b8 !important; color: white !important; }
:global(.obs-row) { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.5rem; }
:global(.obs-input) { flex: 1; font-size: 0.82rem !important; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.35rem 0.6rem; }

/* ── Info banner auto ── */
.info-auto-banner {
  background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
  padding: 0.75rem 1rem; display: flex; gap: 0.75rem; align-items: flex-start;
  color: #1e40af; font-size: 0.85rem; margin-bottom: 1.2rem;
}

/* ── Política textarea ── */
.obs-block { margin-top: 1.5rem; }
.obs-label { font-size: 0.85rem; font-weight: 600; color: #334155; display: block; margin-bottom: 0.5rem; }
.textarea-voz-wrap { display: flex; align-items: flex-start; gap: 0.5rem; }

/* ── Resumen ── */
.resumen-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.resumen-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; }
.card-ok       { background: #f0fdf4; border-color: #bbf7d0; }
.card-pendiente{ background: #fffbeb; border-color: #fde68a; }
.resumen-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }
.resumen-sec-num { font-size: 0.72rem; font-weight: 600; color: #64748b; }
.resumen-sec-title { display: block; font-size: 0.9rem; font-weight: 600; color: #1e293b; margin-bottom: 0.5rem; }
.resumen-stats { font-size: 0.8rem; color: #64748b; display: flex; flex-direction: column; gap: 2px; }
.resumen-auto { color: #22c55e; display: flex; align-items: center; gap: 0.3rem; }

/* ── Firma ── */
.firma-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.2rem; margin-bottom: 1.5rem; }
.firma-section h4 { margin: 0 0 1rem; color: #1e3a5f; font-size: 0.95rem; }
.firma-box { display: flex; justify-content: space-between; align-items: center; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 1.2rem; background: white; }
.firma-placeholder { display: flex; align-items: center; gap: 0.5rem; color: #64748b; font-size: 0.9rem; }
.firma-fecha { font-size: 0.82rem; color: #94a3b8; }
.firma-desc { font-size: 0.78rem; color: #94a3b8; margin: 0.75rem 0 0; }

/* ── Acciones finales ── */
.acciones-finales { display: flex; gap: 1rem; flex-wrap: wrap; }

/* ── Nav inferior ── */
.f1-nav {
  position: sticky; bottom: 0; background: white; border-top: 1px solid #e2e8f0;
  padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
}
.nav-indicador { font-size: 0.85rem; color: #64748b; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
