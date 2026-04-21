import type { ExtMessage, ResumeData } from '../types/resume'

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('resumeData', (result) => {
    if (!result.resumeData) {
      chrome.storage.local.set({ resumeData: null })
    }
  })
})

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
    }
  },
)
