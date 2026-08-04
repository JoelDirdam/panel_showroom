import { nextTick } from 'vue'
import { driver, type Driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getAdminTourSteps } from './adminTour'
import { getBrandTourSteps } from './brandTour'
import { closeTourModals, dispatchTourEvent } from './tourEvents'
import { isTourDone, markTourDone, clearTourDone, type TourRole } from './tourStorage'
import type { TourStepDef } from './types'

let activeDriver: Driver | null = null
let starting = false
let routerRef: Router | null = null
let ensureSidebarOpenFn: (() => void) | null = null

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForSelector(selector: string, timeoutMs = 4000): Promise<Element | null> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(selector)
    if (el) return el
    await wait(50)
  }
  return document.querySelector(selector)
}

function ensureSidebarOpen(): void {
  ensureSidebarOpenFn?.()
}

export function setTourSidebar(fn: () => void): void {
  ensureSidebarOpenFn = fn
}

async function prepareStep(step: TourStepDef): Promise<void> {
  if (step.ensureSidebar) ensureSidebarOpen()

  if (step.route && routerRef && routerRef.currentRoute.value.path !== step.route) {
    closeTourModals()
    await routerRef.push(step.route)
    await nextTick()
    await wait(120)
  } else if (!step.open) {
    closeTourModals()
  }

  if (step.open) {
    dispatchTourEvent(step.open)
    await nextTick()
    await wait(80)
  }

  if (step.element) {
    await waitForSelector(step.element)
  }

  if (step.ensureSidebar) ensureSidebarOpen()
}

function toDriveSteps(defs: TourStepDef[]): DriveStep[] {
  return defs.map((def) => ({
    element: def.element,
    disableActiveInteraction: def.disableInteraction ?? true,
    popover: {
      title: def.popover.title,
      description: def.popover.description,
      side: def.popover.side ?? 'bottom',
      align: def.popover.align ?? 'start',
    },
  }))
}

function finishTour(role: TourRole, userId: string): void {
  markTourDone(userId, role)
  closeTourModals()
  activeDriver = null
  starting = false
}

export function stopTour(): void {
  if (activeDriver) {
    activeDriver.destroy()
    activeDriver = null
  }
  closeTourModals()
  starting = false
}

export async function startTour(options?: { force?: boolean }): Promise<void> {
  if (starting) return
  const auth = useAuthStore()
  if (!auth.user || auth.mustChangePassword) return
  if (!routerRef) return

  const role: TourRole = auth.isBusiness ? 'BUSINESS' : 'BRAND'
  const userId = auth.user.id

  if (!options?.force && isTourDone(userId, role)) return

  if (activeDriver) {
    activeDriver.destroy()
    activeDriver = null
  }

  starting = true
  const defs = role === 'BUSINESS' ? getAdminTourSteps() : getBrandTourSteps()

  try {
    await prepareStep(defs[0])

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 10,
      popoverOffset: 12,
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Listo',
      progressText: '{{current}} de {{total}}',
      steps: toDriveSteps(defs),
      onNextClick: async (_el, _step, { driver: d }) => {
        const nextIndex = (d.getActiveIndex() ?? 0) + 1
        if (nextIndex < defs.length) {
          await prepareStep(defs[nextIndex])
        }
        d.moveNext()
      },
      onPrevClick: async (_el, _step, { driver: d }) => {
        const prevIndex = (d.getActiveIndex() ?? 0) - 1
        if (prevIndex >= 0) {
          await prepareStep(defs[prevIndex])
        }
        d.movePrevious()
      },
      onDestroyStarted: (_el, _step, { driver: d }) => {
        finishTour(role, userId)
        if (d.isActive()) d.destroy()
      },
      onDestroyed: () => {
        closeTourModals()
        activeDriver = null
        starting = false
      },
    })

    activeDriver = driverObj
    driverObj.drive()
  } catch (err) {
    console.error('No se pudo iniciar el tutorial', err)
    closeTourModals()
    starting = false
    activeDriver = null
  }
}

/** Auto-start after login disabled — tours only via replayTour() if wired to UI. */
export async function maybeAutoStart(): Promise<void> {
  return
}

export async function replayTour(): Promise<void> {
  const auth = useAuthStore()
  if (!auth.user) return
  const role: TourRole = auth.isBusiness ? 'BUSINESS' : 'BRAND'
  clearTourDone(auth.user.id, role)
  stopTour()
  if (routerRef && routerRef.currentRoute.value.path !== '/') {
    await routerRef.push('/home')
    await nextTick()
    await wait(200)
  }
  await startTour({ force: true })
}

export function setTourRouter(router: Router): void {
  routerRef = router
}

export function useTour() {
  return {
    startTour,
    stopTour,
    maybeAutoStart,
    replayTour,
    setTourRouter,
    setTourSidebar,
    isRunning: () => !!activeDriver,
  }
}
