// This is a hack to work with Firefox Content extensions.
//
// Using content.fetch will allow CORS to work appropriately in the context
// of the page. By default it looks like CORS won't allow fetch to work as
// expected.
const extensionFetch =
  typeof content !== "undefined" && typeof content.fetch === "function"
    ? content.fetch
    : fetch;

const getReplacementTitle = async (original) => {
  const res = await extensionFetch(
    "https://bitsden-click-switch.herokuapp.com/get-title",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // This must match the normalisation in `src/server/scraper.ts`
        original: original.toLowerCase().replace(/[^a-z0-9 ]/, ""),
      }),
    }
  );
  if (!res.ok) {
    return;
  }
  const { replacement } = await res.json();
  return replacement;
};

let promiseChain = Promise.resolve();

const originalTitles = new Set();
const replacements = new Map();

const scanForTitles = async () => {
  for (let a of document.querySelectorAll("h3 a#video-title")) {
    if (a.href && a.href.includes("/watch?v=")) {
      const title = a.title || a.innerText;
      if (title && !originalTitles.has(title)) {
        originalTitles.add(title);
        promiseChain = promiseChain.then(async () => {
          let replacement;
          if (!replacements.has(title)) {
            try {
              replacement = await getReplacementTitle(title);
              if (replacement) {
                originalTitles.add(replacement);
                replacements.set(title, replacement);
              }
            } catch (e) {
              throw e;
            }
          } else {
            replacement = replacements.get(title);
          }
          if (replacement) {
            a.title = replacement;
            a.innerText = replacement;
          }
        });
      }
    }
  }
};

if (window.location.pathname.startsWith("/c/LinusTechTips")) {
  const observer = new MutationObserver(scanForTitles);
  observer.observe(document.body, { childList: true, subtree: true });
}
