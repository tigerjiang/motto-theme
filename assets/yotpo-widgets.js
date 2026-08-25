(function () {
  const refreshWidgets = () => {
    try {
      if (window.yotpoWidgetsContainer && typeof window.yotpoWidgetsContainer.initWidgets === "function") {
        window.yotpoWidgetsContainer.initWidgets();
        return;
      }

      if (typeof window.Yotpo !== "undefined" && typeof window.yotpo !== "undefined" && window.Yotpo.API) {
        new window.Yotpo.API(window.yotpo).refreshWidgets();
        return;
      }

      if (window.yotpo && typeof window.yotpo.refreshWidgets === "function") {
        window.yotpo.refreshWidgets();
      }
    } catch (error) {
      if (window.console && typeof window.console.warn === "function") {
        window.console.warn("Failed to refresh Yotpo widgets", error);
      }
    }
  };

  let refreshTimeout;
  const scheduleRefresh = () => {
    window.clearTimeout(refreshTimeout);
    refreshTimeout = window.setTimeout(refreshWidgets, 0);
    window.setTimeout(refreshWidgets, 300);
    window.setTimeout(refreshWidgets, 1200);
  };

  window.MottoYotpo = {
    refresh: refreshWidgets,
    scheduleRefresh,
  };

  const observeDynamicWidgets = () => {
    const observer = new MutationObserver((mutations) => {
      const widgetAdded = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.matches(".yotpo-widget-instance") || node.querySelector(".yotpo-widget-instance"))
        )
      );

      if (widgetAdded) scheduleRefresh();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeDynamicWidgets, { once: true });
  } else {
    observeDynamicWidgets();
  }

  document.addEventListener("shopify:section:load", scheduleRefresh);
  window.addEventListener("load", scheduleRefresh, { once: true });
})();
