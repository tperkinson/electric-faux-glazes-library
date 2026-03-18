const input = document.getElementById("glaze-search-input");
const summary = document.getElementById("glaze-search-summary");
const results = document.getElementById("glaze-search-results");

if (input && summary && results) {
  const sections = [
    {
      key: "recipes",
      label: "DIY Recipe",
      href: (item) => `recipes/${item.slug}.html`,
      text: (item) => [
        item.title,
        item.summary,
        ...(item.surface_tags || []),
        ...(item.atmosphere_targets || []),
        ...(item.clay_bodies || []),
      ].join(" "),
      meta: (item) => `Cone ${item.cone || "?"}`,
    },
    {
      key: "products",
      label: "Commercial",
      href: (item) => `products/${item.slug}.html`,
      text: (item) => [
        item.title,
        item.summary,
        item.brand,
        item.line,
        ...(item.effect_tags || []),
        ...(item.finish_tags || []),
      ].join(" "),
      meta: (item) => `${item.brand || "Commercial"} | Cone ${item.cone || "?"}`,
    },
    {
      key: "reports",
      label: "Research Report",
      href: (item) => `reports/${item.slug}.html`,
      text: (item) => [item.title, item.summary, ...(item.tags || [])].join(" "),
      meta: (item) => item.report_date || "Undated",
    },
    {
      key: "sources",
      label: "Source",
      href: (item) => `sources/${item.slug}.html`,
      text: (item) => [item.title, item.url, item.publisher, ...(item.tags || [])].join(" "),
      meta: (item) => item.publisher || item.domain || "Source note",
    },
    {
      key: "test_plans",
      label: "Test Plan",
      href: (item) => `test-plans/${item.slug}.html`,
      text: (item) => [
        item.title,
        ...(item.comparison_axes || []),
        ...(item.success_criteria || []),
      ].join(" "),
      meta: (item) => `Cone ${item.cone || "?"} | ${item.status || "planned"}`,
    },
  ];

  fetch("data/catalog.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("catalog request failed");
      }
      return response.json();
    })
    .then((catalog) => {
      const index = sections.flatMap((section) =>
        (catalog[section.key] || []).map((item) => ({
          kind: section.label,
          href: section.href(item),
          title: item.title || "Untitled",
          summary: item.summary || item.url || "",
          meta: section.meta(item),
          searchable: section.text(item).toLowerCase(),
        }))
      );

      const renderEmpty = (message) => {
        results.innerHTML = "";
        summary.textContent = message;
      };

      const renderResults = (matches, query) => {
        if (!matches.length) {
          renderEmpty(`No matches for "${query}". Try a broader surface word or brand name.`);
          return;
        }
        summary.textContent = `${matches.length} match${matches.length === 1 ? "" : "es"} for "${query}".`;
        results.innerHTML = matches
          .slice(0, 12)
          .map(
            (match) => `
              <a class="stack-card library-card" href="${match.href}">
                <p class="eyebrow">${match.kind}</p>
                <h3>${escapeHtml(match.title)}</h3>
                <p>${escapeHtml(match.summary || "Open item")}</p>
                <p class="card-meta">${escapeHtml(match.meta)}</p>
              </a>
            `
          )
          .join("");
      };

      input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();
        if (query.length < 2) {
          results.innerHTML = "";
          summary.textContent = "Start with a glaze family, surface word, brand, or report topic.";
          return;
        }

        const terms = query.split(/\s+/).filter(Boolean);
        const matches = index
          .map((item) => ({
            ...item,
            score: scoreMatch(item, terms),
          }))
          .filter((item) => item.score > 0)
          .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));

        renderResults(matches, query);
      });
    })
    .catch(() => {
      summary.textContent = "Search is unavailable right now, but the library sections below still work.";
    });
}

function scoreMatch(item, terms) {
  let score = 0;
  for (const term of terms) {
    if (!item.searchable.includes(term)) {
      return 0;
    }
    if (item.title.toLowerCase().includes(term)) {
      score += 5;
    }
    if (item.summary.toLowerCase().includes(term)) {
      score += 2;
    }
    score += 1;
  }
  return score;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
