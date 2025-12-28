if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/JS/sw.js")
      .then(() => console.log("✅ Service Worker registrado"))
      .catch(err => console.error("❌ Error SW:", err));
  });
}
