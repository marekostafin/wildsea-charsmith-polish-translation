(() => {
  'use strict';

  const API = globalThis.chrome ?? globalThis.browser;
  const CONFIG_URL = API.runtime.getURL('translations.json');
  const EXCLUDED_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA'
  ]);
  const translatedTextNodes = new WeakSet();

  let config = {
    enabled: true,
    exact: {},
    phrases: {},
  };

  let observer = null;
  let queue = new Set();
  let flushScheduled = false;

  function normalizeForMatch(value) {
    return value.replace(/\s+/g, ' ').trim();
  }

  function preserveOuterWhitespace(original, translated) {
    const match = original.match(/^(\s*)(.*?)(\s*)$/s);
    if (!match) return translated;
    return `${match[1]}${translated}${match[3]}`;
  }

  function sortedEntries(map) {
    return Object.entries(map || {})
      .filter(([source, target]) =>
        typeof source === 'string' && source.length > 0 && typeof target === 'string'
      )
      .sort((a, b) => b[0].length - a[0].length);
  }

  function translateString(value) {
    if (typeof value !== 'string' || !value) {
      return { value, changed: false };
    }

    const normalized = normalizeForMatch(value);
    if (!normalized) {
      return { value, changed: false };
    }

    const exact = config.exact || {};
    if (Object.prototype.hasOwnProperty.call(exact, normalized)) {
      const target = exact[normalized];
      if (typeof target === 'string' && target !== normalized) {
        return {
          value: preserveOuterWhitespace(value, target),
          changed: true
        };
      }
    }

    let result = value;
    for (const [source, target] of sortedEntries(config.phrases)) {
      if (!result.includes(source)) continue;
      result = result.split(source).join(target);
    }

    return {
      value: result,
      changed: result !== value
    };
  }

  function shouldSkipElement(element) {
    if (!(element instanceof Element)) return true;
    if (EXCLUDED_TAGS.has(element.tagName)) return true;
    if (element.closest('[contenteditable="true"], [contenteditable=""]')) return true;
    return false;
  }

  function translateTextNode(node) {
    if (!config.enabled) return;
    if (!(node instanceof Text)) return;
    if (translatedTextNodes.has(node)) return;

    const parent = node.parentElement;
    if (!parent || shouldSkipElement(parent)) return;

    const result = translateString(node.nodeValue);
    translatedTextNodes.add(node);

    if (result.changed) {
      node.nodeValue = result.value;
    }
  }

  function translateElement(element) {
    if (!(element instanceof Element)) return;
    if (shouldSkipElement(element)) return;

    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || shouldSkipElement(parent)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      nodes.push(node);
    }

    for (const textNode of nodes) {
      translateTextNode(textNode);
    }
  }

  function translateDocument() {
    if (!document.body) return;
    translateElement(document.body);
  }

  function queueNode(node) {
    if (!(node instanceof Node)) return;
    queue.add(node);
    if (flushScheduled) return;

    flushScheduled = true;
    requestAnimationFrame(() => {
      flushScheduled = false;
      const pending = queue;
      queue = new Set();

      for (const item of pending) {
        if (item.nodeType === Node.TEXT_NODE) {
          translateTextNode(item);
        } else if (item.nodeType === Node.ELEMENT_NODE) {
          translateElement(item);
        }
      }
    });
  }

  function installObserver() {
    if (observer) observer.disconnect();
    if (!document.body) return;

    observer = new MutationObserver((mutations) => {
      if (!config.enabled) return;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          queueNode(node);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  async function loadConfig() {
    try {
      const response = await fetch(CONFIG_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Could not load translations.json: HTTP ${response.status}`);
      }

      const dictionary = await response.json();
      const stored = await API.storage.local.get({
        translationEnabled: true,
      });

      config = {
        enabled: stored.translationEnabled !== false,
        exact: dictionary.exact || {},
        phrases: dictionary.phrases || {},
      };

    } catch (error) {
      console.error('[Wildsea Polish Translation]', error);
      config.enabled = false;
    }
  }

  async function start() {
    await loadConfig();
    if (!document.body) {
      window.addEventListener('DOMContentLoaded', start, { once: true });
      return;
    }

    translateDocument();
    installObserver();
  }

  API.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    if (changes.translationEnabled) {
      const enabled = changes.translationEnabled.newValue !== false;
      config.enabled = enabled;
      if (enabled) {
        // Re-scan after enabling; the page may have gained new content meanwhile.
        translateDocument();
      }
      installObserver();
    }
  });

  start();
})();
