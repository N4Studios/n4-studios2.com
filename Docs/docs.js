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
    let path = window.location.pathname.replace(/\/$/, "");
    let folderName = path.substring(path.lastIndexOf('/') + 1);

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
    let extraCardsHtml = "";

    // 2. Parse sections from content_json array
    contentList.forEach((item, index) => {
        const mediaUrl = resolvePath(item.media_url || item.imageUrl || item.videoUrl);
        const link = resolvePath(item.link);
        const docs = resolvePath(item.docs);
        const isVideo = item.media_type === "video" || !!item.videoUrl || (mediaUrl && mediaUrl.endsWith(".mp4"));

        if (item.type === "log_entry") {
            let mediaElement = "";
            if (mediaUrl) {
                mediaElement = isVideo
                    ? `<video muted autoplay loop playsinline><source src="${mediaUrl}" type="video/mp4"></video>`
                    : `<img src="${mediaUrl}">`;
            }

            logEntriesHtml += `
                <div class="doc-split">
                    <div class="split-elm">
                        <h3>${item.date}</h3>
                        <p>${item.text || item.desc}</p>
                    </div>
                    <div class="split-elm">
                        ${mediaElement}
                    </div>
                </div>
                <br>
            `;
        } 
        // --- Project Cards (Supports both image & video) ---
        else if (item.type === "project_card" || item.type === "project") {
            let projectTitle = link 
                ? `<a class='blog-title' href='${link}'></a>` 
                : `<p class='blog-title'></p>`;
            
            let blogLinks = `<div class='blog-links'>`;
            if (link) blogLinks += `<a href='${link}'><span class='openLink'></span></a>`;
            if (docs) blogLinks += `<a href='${docs}'><span class='openDocs'></span></a>`;
            blogLinks += `</div>`;

            let isLeft = index % 2 === 0;
            
            let mediaElement = isVideo
                ? `<video class="blog-blob-img" width="40%" muted autoplay loop playsinline><source src="${mediaUrl}" type="video/mp4"></video>`
                : `<img class="blog-blob-img" width="40%" src="${mediaUrl}" alt="Project Image">`;

            extraCardsHtml += `
                <div class="doc-card">
                    <div class="blog-row visible ${isLeft ? 'left' : 'right'}" style="margin: 0; width: 100%;">
                        <div class="blog-content">
                            <div class="blog-titleRow">
                                ${$(projectTitle).html(item.title)[0].outerHTML}
                                ${blogLinks}
                            </div>
                            <div>
                                <h3>${item.date}</h3>
                                <p>${item.desc || item.text}</p>
                            </div>
                        </div>
                        ${mediaElement}
                    </div>
                </div>
            `;
        } 
        else if (item.type === "final_video") {
            let mediaElement = isVideo
                ? `<video muted autoplay loop playsinline><source src="${mediaUrl}" type="video/mp4"></video>`
                : `<img src="${mediaUrl}">`;

            extraCardsHtml += `
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

    // 4. Append Project cards / Final videos if present
    if (extraCardsHtml) {
        containerInner.append(extraCardsHtml);
    }
}

$(document).ready(function () {
    renderDocPage();
});