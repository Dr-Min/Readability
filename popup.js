document.addEventListener('DOMContentLoaded', () => {
    const textAlignSelect = document.getElementById('textAlign');

    // 저장된 설정 불러오기
    chrome.storage.sync.get(['textAlign'], (result) => {
        if (result.textAlign) {
            textAlignSelect.value = result.textAlign;
        }
    });

    // 설정 변경 시 저장
    textAlignSelect.addEventListener('change', () => {
        const newAlign = textAlignSelect.value;
        
        // 먼저 설정 저장
        chrome.storage.sync.set({ textAlign: newAlign }, () => {
            console.log('설정이 저장되었습니다.');
        });

        // 현재 탭에 메시지 전송
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            if (tabs[0]?.id) {
                try {
                    await chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'updateTextAlign',
                        textAlign: newAlign
                    });
                    console.log('설정이 페이지에 적용되었습니다.');
                } catch (error) {
                    console.log('페이지를 새로고침하면 설정이 적용됩니다.');
                }
            }
        });
    });
}); 