window.generateAndShareImage = async function(btnId, containerWidth, containerHeight, buildHtmlContent, filename, shareTitle, shareText) {
  if (!window.html2canvas) {
    showToast("Sharing is loading, please try again in a second.");
    return;
  }
  
  const shareBtn = document.getElementById(btnId);
  const origText = shareBtn.innerHTML;
  shareBtn.innerHTML = typeof DOMPurify !== "undefined" ? DOMPurify.sanitize("Generating Image...") : "Generating Image...";
  shareBtn.disabled = true;

  const shareContainer = document.createElement("div");
  shareContainer.style.position = "absolute";
  shareContainer.style.left = "-9999px";
  shareContainer.style.top = "-9999px";
  
  const card = document.createElement("div");
  card.style.width = containerWidth;
  card.style.height = containerHeight;
  card.style.background = "#15181B";
  card.style.color = "#F2F0EA";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.justifyContent = "center";
  card.style.alignItems = "center";
  card.style.fontFamily = "'Inter', sans-serif";
  card.style.boxSizing = "border-box";
  
  card.innerHTML = typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(buildHtmlContent()) : buildHtmlContent();
  
  shareContainer.appendChild(card);
  document.body.appendChild(shareContainer);

  try {
    const canvas = await html2canvas(card, {
      scale: 1,
      useCORS: true,
      backgroundColor: "#15181B"
    });
    
    canvas.toBlob(async (blob) => {
      try {
        if (!blob) throw new Error("Failed to generate image blob");
        const file = new File([blob], filename, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: shareTitle,
              text: shareText
            });
          } catch (shareErr) {
            if (shareErr.name !== 'AbortError') {
              console.error("Error sharing:", shareErr);
              downloadBlob(blob, filename);
            }
          }
        } else {
          downloadBlob(blob, filename);
        }
      } finally {
        cleanup();
      }
    }, 'image/png', 1.0);
  } catch (err) {
    console.error("Canvas generation failed:", err);
    showToast("Could not generate image.");
    cleanup();
  }

  function downloadBlob(b, name) {
    const url = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function cleanup() {
    document.body.removeChild(shareContainer);
    shareBtn.innerHTML = origText;
    shareBtn.disabled = false;
  }
};
