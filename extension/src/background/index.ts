import type { ExtMessage, ResumeData } from '../types/resume'

const API_BASE = 'http://localhost:8000/api'

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('resumeData', (result) => {
    if (!result.resumeData) {
      chrome.storage.local.set({ resumeData: null })
    }
  })
})

async function parseFileVL(data: { fileName: string; fileData: string; fileType: string }): Promise<{ data?: ResumeData; error?: string }> {
  try {
    const binaryStr = atob(data.fileData)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
    const blob = new Blob([bytes], { type: data.fileType })
    const formData = new FormData()
    formData.append('file', blob, data.fileName)
    const resp = await fetch(`${API_BASE}/resumes/parse-file`, { method: 'POST', body: formData })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }))
      return { error: err.detail || '解析失败' }
    }
    return { data: await resp.json() }
  } catch (e) {
    return { error: (e as Error).message || '网络请求失败' }
  }
}

chrome.runtime.onMessage.addListener(
  (message: ExtMessage, _sender, sendResponse: (resp: unknown) => void) => {
    switch (message.type) {
      case 'SAVE_RESUME':
        chrome.storage.local.set({ resumeData: message.data }, () => {
          sendResponse({ success: true })
        })
        return true

      case 'GET_RESUME':
        chrome.storage.local.get('resumeData', (result) => {
          sendResponse({ data: result.resumeData as ResumeData | null })
        })
        return true

      case 'FILL_FORM':
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { type: 'DO_FILL', data: message.data },
              (resp) => sendResponse(resp),
            )
          }
        })
        return true

      case 'SCAN_FORM':
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { type: 'DO_SCAN' },
              (resp) => sendResponse(resp),
            )
          }
        })
        return true

      case 'PARSE_FILE_VL':
        parseFileVL(message.data).then(sendResponse)
        return true
    }
  },
)
