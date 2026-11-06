import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { executeTool, OPENAI_TOOLS } from './tools.js'
import type { AiRuntimeContext } from './types.js'
import { FALLBACK_CUSTOMER_MESSAGE } from './types.js'

const MAX_TOOL_ROUNDS = 4

function openaiTimeoutMs(): number {
  const raw = Number(process.env.OPENAI_TIMEOUT_MS)
  return Number.isFinite(raw) && raw >= 3000 ? raw : 20_000
}

function openaiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
}

export function createOpenAiClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null
  return new OpenAI({ apiKey, timeout: openaiTimeoutMs() })
}

export async function runConversationLlm(params: {
  client: OpenAI
  systemPrompt: string
  history: ChatCompletionMessageParam[]
  userMessage: string
  ctx: AiRuntimeContext
}): Promise<string> {
  const timeoutMs = openaiTimeoutMs()
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: params.systemPrompt },
    ...params.history,
    { role: 'user', content: params.userMessage },
  ]

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const completion = await params.client.chat.completions.create(
      {
        model: openaiModel(),
        messages,
        tools: OPENAI_TOOLS,
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 800,
      },
      { timeout: timeoutMs, signal: AbortSignal.timeout(timeoutMs) },
    )

    const msg = completion.choices[0]?.message
    if (!msg) break
    messages.push(msg)

    if (!msg.tool_calls?.length) {
      const text = msg.content?.trim()
      return text || FALLBACK_CUSTOMER_MESSAGE
    }

    for (const call of msg.tool_calls) {
      if (call.type !== 'function') continue
      const result = await executeTool(call.function.name, call.function.arguments, params.ctx)
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: result,
      })
    }
  }

  const final = await params.client.chat.completions.create(
    {
      model: openaiModel(),
      messages,
      tool_choice: 'none',
      temperature: 0.3,
      max_tokens: 800,
    },
    { timeout: timeoutMs, signal: AbortSignal.timeout(timeoutMs) },
  )
  const text = final.choices[0]?.message?.content?.trim()
  return text || FALLBACK_CUSTOMER_MESSAGE
}
