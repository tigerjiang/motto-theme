(function () {
  const refreshWidgets = () => {
    try {
      if (window.yotpoWidgetsContainer && typeof window.yotpoWidgetsContainer.initWidgets === "function") {
        window.yotpoWidgetsContainer.initWidgets();
        return true;
      }

      if (typeof window.Yotpo !== "undefined" && typeof window.yotpo !== "undefined" && window.Yotpo.API) {
        new window.Yotpo.API(window.yotpo).refreshWidgets();
        return true;
      }

      if (window.yotpo && typeof window.yotpo.refreshWidgets === "function") {
        window.yotpo.refreshWidgets();
        return true;
      }
    } catch (error) {
      if (window.console && typeof window.console.warn === "function") {
        window.console.warn("Failed to refresh Yotpo widgets", error);
      }
    }

    return false;
  };

  let refreshTimeout;
  let retryTimeout;

  const refreshWhenReady = (attempt = 0) => {
    if (refreshWidgets() || attempt >= 8) return;

    retryTimeout = window.setTimeout(() => {
      refreshWhenReady(attempt + 1);
    }, 250);
  };

  const scheduleRefresh = () => {
    window.clearTimeout(refreshTimeout);
    window.clearTimeout(retryTimeout);
    refreshTimeout = window.setTimeout(refreshWhenReady, 100);
  };

  window.MottoYotpo = {
    refresh: refreshWidgets,
    scheduleRefresh,
  };

  document.addEventListener("shopify:section:load", scheduleRefresh);
})();
