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
    path = path.replace("index.html", "");
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

// Helper function to build media elements (Image, MP4 Video, or iFrame)
function createMediaElement(rawUrl, mediaTypeOverride, customClass = "") {
    const mediaUrl = resolvePath(rawUrl);
    if (!mediaUrl) return "";

    const isIframe = mediaTypeOverride === "iframe" || 
                     mediaUrl.includes("/preview") || 
                     mediaUrl.includes("drive.google.com") || 
                     mediaUrl.includes("youtube.com/embed");

    const isVideo = mediaTypeOverride === "video" || 
                    mediaUrl.endsWith(".mp4") || 
                    mediaUrl.endsWith(".webm");

    if (isIframe) {
        return `<iframe class="${customClass}" src="${mediaUrl}" allow="autoplay" frameborder="0" allowfullscreen></iframe>`;
    } else if (isVideo) {
        return `<video class="${customClass}" ${customClass ? 'width="40%"' : 'width="100%"'} muted autoplay loop playsinline><source src="${mediaUrl}" type="video/mp4"></video>`;
    } else {
        return `<img class="${customClass}" ${customClass ? 'width="40%"' : ''} src="${mediaUrl}" alt="Media Content">`;
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
        const targetUrl = item.iframeUrl || item.iframe || item.media_url || item.imageUrl || item.videoUrl;
        const link = resolvePath(item.link);
        const docs = resolvePath(item.docs);

        if (item.type === "log_entry") {
            const mediaElement = createMediaElement(targetUrl, item.media_type);

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
        // --- Project Cards (Supports Image, Video, & iFrame Embeds) ---
        else if (item.type === "project_card" || item.type === "project") {
            let projectTitle = link 
                ? `<a class='blog-title' href='${link}'></a>` 
                : `<p class='blog-title'></p>`;
            
            let blogLinks = `<div class='blog-links'>`;
            if (link) blogLinks += `<a href='${link}'><span class='openLink'></span></a>`;
            if (docs) blogLinks += `<a href='${docs}'><span class='openDocs'></span></a>`;
            blogLinks += `</div>`;

            let isLeft = index % 2 === 0;
            const mediaElement = createMediaElement(targetUrl, item.media_type, "blog-blob-img");

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
        else if (item.type === "final_video" || item.type === "final_media") {
            const mediaElement = createMediaElement(targetUrl, item.media_type || "iframe");

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

    // 4. Append Project cards / Final video cards if present
    if (extraCardsHtml) {
        containerInner.append(extraCardsHtml);
    }
}

$(document).ready(function () {
    renderDocPage();
});