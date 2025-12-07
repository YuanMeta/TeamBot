import type { KDB } from './db/instance'

const providerMap = new Map([['google', 'gemini']])
export const fetchOpenRouterModels = async (db: KDB) => {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models').then((res) =>
      res.json()
    )
    const data = res.data

    const modelsToInsert = data
      .filter((model: any) => model.supported_parameters?.includes('tools'))
      .map((model: any) => {
        const [provider, modelId] = model.id.split('/')
        return {
          model: modelId.split(':')[0],
          provider: providerMap.get(provider) ?? provider,
          options: JSON.stringify(model)
        }
      })

    if (modelsToInsert.length > 0) {
      await db
        .insertInto('models')
        .values(modelsToInsert)
        .onConflict((oc) => oc.columns(['model', 'provider']).doNothing())
        .execute()
    }
  } catch (e) {
    console.error('Failed to fetch OpenRouter models', e)
  }
}
