// Standalone getPreDir helper function
function getPreDir() {
    let url = window.location.pathname;
    let domain = "n4-studios2.com";
    let path = url.indexOf(domain) !== -1 ? url.substring(url.indexOf(domain) + domain.length) : url;
    let subDirAmnt = (path.match(/\//g) || []).length - 1;
    let preDir = "";
    for (let i = 0; i < subDirAmnt; i++) {
        preDir += "../";
    }
    return preDir;
}

function resolvePath(pathStr) {
    if (!pathStr) return "";
    return pathStr.replace(/^\$\{getPreDir\(\)\}/, getPreDir());
}

// Extracts the slug from the URL path (e.g., /Docs/BestOfPackTV/ -> best-of-pack-tv)
function getDocSlugFromURL() {
    let path = window.location.pathname.replace(/\/$/, ""); // Remove trailing slash
    let folderName = path.substring(path.lastIndexOf('/') + 1);

    // Converts CamelCase / PascalCase to kebab-case (e.g. BestOfPackTV -> best-of-pack-tv)
    return folderName
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .toLowerCase();
}

async function fetchDocPage(docSlug) {
    try {
        const response = await fetch(`https://n4-studios-projects-api.nielsen101004.workers.dev/?doc=${docSlug}`);
        if (!response.ok) throw new Error("API response error loading document");
        return await response.json();
    } catch (e) {
        console.error("Failed to load document page:", e);
        return null;
    }
}

async function renderDocPage() {
    const slug = getDocSlugFromURL();
    const data = await fetchDocPage(slug);
    
    if (!data || !data.content_json) {
        console.warn(`No content found for document slug: ${slug}`);
        return;
    }

    const contentList = typeof data.content_json === "string" 
        ? JSON.parse(data.content_json) 
        : data.content_json;

    const containerInner = $("#docContainer .doc-container-inner");
    if (containerInner.length === 0) return;

    containerInner.empty();

    // 1. Render Main Title Card
    containerInner.append(`
        <div class="doc-intro doc-card">
            <h1 class="doc-title">${data.title}</h1>
        </div>
    `);

    let logEntriesHtml = "";
    let finalCardsHtml = "";

    // 2. Parse sections from content_json array
    contentList.forEach((item) => {
        const mediaUrl = resolvePath(item.media_url);

        if (item.type === "log_entry") {
            let mediaElement = "";
            if (mediaUrl) {
                mediaElement = item.media_type === "video"
                    ? `<video muted autoplay loop playsinline><source src="${mediaUrl}" type="video/mp4"></video>`
                    : `<img src="${mediaUrl}">`;
            }

            logEntriesHtml += `
                <div class="doc-split">
                    <div class="split-elm">
                        <h3>${item.date}</h3>
                        <p>${item.text}</p>
                    </div>
                    <div class="split-elm">
                        ${mediaElement}
                    </div>
                </div>
                <br>
            `;
        } else if (item.type === "final_video") {
            let mediaElement = item.media_type === "video"
                ? `<video muted autoplay loop playsinline><source src="${mediaUrl}" type="video/mp4"></video>`
                : `<img src="${mediaUrl}">`;

            finalCardsHtml += `
                <div class="doc-card">
                    <div class="doc-full">
                        <h1>${item.title || "FINAL"}</h1>
                        ${mediaElement}
                    </div>
                </div>
            `;
        }
    });

    // 3. Append Work Log section if present
    if (logEntriesHtml) {
        containerInner.append(`
            <div class="doc-card">
                <div class="doc-full">
                    <h1>WORK LOG</h1>
                    ${logEntriesHtml}
                </div>
            </div>
        `);
    }

    // 4. Append Final video/image section if present
    if (finalCardsHtml) {
        containerInner.append(finalCardsHtml);
    }
}

$(document).ready(function () {
    renderDocPage();
});