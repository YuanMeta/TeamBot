import { webSearch } from './tools/web-search'

export const openaiTools = {
  /**
   * Web search allows models to access up-to-date information from the internet
   * and provide answers with sourced citations.
   *
   * Must have name `web_search`.
   *
   * @param filters - The filters to use for the web search.
   * @param searchContextSize - The search context size to use for the web search.
   * @param userLocation - The user location to use for the web search.
   */
  webSearch
}
