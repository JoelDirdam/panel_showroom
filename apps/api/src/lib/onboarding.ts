import type { OnboardingStep } from '@prisma/client'

const STEP_ORDER: OnboardingStep[] = ['REGISTERED', 'EMAIL_VERIFIED', 'PLAN_SELECTED', 'BUSINESS_CREATED', 'DONE']

export function stepIndex(step: OnboardingStep): number {
  return STEP_ORDER.indexOf(step)
}

/** Nunca retrocede el paso de onboarding, solo avanza si `candidate` es posterior a `current`. */
export function advanceStep(current: OnboardingStep, candidate: OnboardingStep): OnboardingStep {
  return stepIndex(candidate) > stepIndex(current) ? candidate : current
}
