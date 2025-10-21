<script lang="ts">
    import { getContext, onDestroy, onMount } from "svelte";
    import { cubicIn, elasticOut, quartOut } from "svelte/easing";
    import { Tween } from "svelte/motion";
    import { marked }from 'marked';
    import type { ChunkManager } from "$lib/framework/chunkManager";

    const PaneState = {
		Default: "Default",
		MovingPane: "MovingPane",
		ResizingPane: "ResizingPane",
		Maximized: "Maximized",
	} as const;

    let { data } = $props();
    let paneData: PaneData = $state(data);
    let paneState: PaneStateKey = $state(PaneState.Default);
    let appState: AppState = getContext("appstate");
    let chunkManager: ChunkManager = getContext("chunkManager");


    let unscaledWidth = $derived(paneData.paneSize[0] * appState.unitToPixelRatio.current);
    let unscaledHeight = $derived(paneData.paneSize[1] * appState.unitToPixelRatio.current);
    let xOffset = $derived(paneData.paneCoords[0] * appState.unitToPixelRatio.current);  
    let yOffset = $derived(paneData.paneCoords[1] * appState.unitToPixelRatio.current);  
    let active = $state(false);
    let dragging = $state(false);
    let shouldCancelPointerEvents = $derived((appState.state == "MovingPane") ? "pointer-events-none" : "");
    let resizing = $state(0);
    let mouseDelta = [0, 0];
    let persistenceTimeout: NodeJS.Timeout | null = null;
    let isSelected = $derived(appState.isSelected(paneData.uuid));

    let scale = new Tween(1, {
        easing: quartOut,
        duration: 200,
    });
    let width = $derived(scale.current * unscaledWidth);
    let height = $derived(scale.current * unscaledHeight);

    let borderColor = $derived(rgbaToHex(...paneData.color));
    function rgbaToHex(r: number, g: number, b: number, a: number) {
        const toHex = (value: number) => value.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }


    function onmouseenter() {
        active = true;
        scale.set(1.02);
        appState.activePane = paneData.uuid;
    }
    function onmouseleave() {
        active = false;
        dragging = false;
        scale.set(1);
    }
    
    function onmousedown(event: MouseEvent) {
        if (!active) {
            return;
        }
        
        // Handle shift-click selection
        if (event.shiftKey) {
            appState.toggleSelection(paneData.uuid);
            event.stopPropagation();
            return;
        }
        
        let resizeMargin = 0;
        if (event.x > xOffset + width - resizeMargin) {
            console.log("right")
            // resize right
            resizing = 2;
            return;
        } else if (event.x < xOffset + resizeMargin) {
            console.log("left")
            //resizing left
            resizing = 4;
            return;
        } else if (event.y < yOffset + resizeMargin) {
            console.log("top")
            // resize top
            resizing = 1;
            return;
        } else if (event.y > height + yOffset - resizeMargin) {
            console.log("bottom")
            resizing = 3
            return;
        }

        if (appState.state != "MovingPane") {
            return;
        }

        scale.set(1.1);
        dragging = true;
        event.stopPropagation();
    }

    function triggerPersistence() {
        // Clear any existing timeout
        if (persistenceTimeout) {
            clearTimeout(persistenceTimeout);
        }
        
        // Debounce persistence to avoid too many storage writes
        persistenceTimeout = setTimeout(() => {
            try {
                // Update the pane data in the chunk manager's tracking
                const chunkHolder = chunkManager.loadedChunks.get(paneData.chunkCoords[0])?.get(paneData.chunkCoords[1]);
                if (chunkHolder) {
                    chunkHolder.paneData.set(paneData.uuid, paneData);
                    // Trigger persistence to storage
                    chunkManager.persistChunkToStorage(paneData.chunkCoords, chunkHolder);
                }
            } catch (error) {
                console.warn('Failed to persist pane changes:', error);
            }
        }, 100); // 100ms debounce
    }

    function onmouseup() {
        dragging = false;
        resizing = 0;
        scale.set(1.02);
        
        // Trigger persistence when dragging/resizing ends
        triggerPersistence();
        paneState = "Maximized";
    }
    function onmousemove(event: MouseEvent) {
        if (dragging) {
            xOffset += event.movementX;
            yOffset += event.movementY;
            
            // Update the underlying paneData coordinates
            paneData.paneCoords[0] = xOffset / appState.unitToPixelRatio.current;
            paneData.paneCoords[1] = yOffset / appState.unitToPixelRatio.current;
            return;
        }

        switch (resizing) {
            case 1:
                yOffset += event.movementY;
                unscaledHeight += event.movementY;
                paneData.paneCoords[1] = yOffset / appState.unitToPixelRatio.current;
                paneData.paneSize[1] = height / appState.unitToPixelRatio.current;
                break;
            case 2: 
                //xOffset += event.movementX;
                unscaledWidth += event.movementX;
                paneData.paneSize[0] = width / appState.unitToPixelRatio.current;
                break;
            case 3: 
                //yOffset += event.movementY;
                unscaledHeight += event.movementY;
                paneData.paneSize[1] = height / appState.unitToPixelRatio.current;
                break;
            case 4: 
                xOffset += event.movementX;
                unscaledWidth -= event.movementX;
                paneData.paneCoords[0] = xOffset / appState.unitToPixelRatio.current;
                paneData.paneSize[0] = width / appState.unitToPixelRatio.current;
                break;
        }
    }

    function onPaneWidthInput(e: Event) {
        const v = Number((e.target as HTMLInputElement).value);
        if (!Number.isNaN(v) && v > 0) {
            paneData.paneSize[0] = v;
            triggerPersistence();
        }
    }

    function onPaneHeightInput(e: Event) {
        const v = Number((e.target as HTMLInputElement).value);
        if (!Number.isNaN(v) && v > 0) {
            paneData.paneSize[1] = v;
            triggerPersistence();
        }
    }


    // File preview state (use $state so Svelte reactivity updates the template)
    let pdfUrl = $state<string | null>(null);
    let imgUrl =  $state<string | null>(null);
    let markdownHtml = $state<string | null>(null);
    let urlInput = $state<string>('');
    let iframeUrl = $state<string | null>(null);
    let _prevUrl: string | null = null;
    let viewId: string | null = null;
    let paneElement: HTMLElement | null = null;

    // Debug vars to help diagnose markdown rendering
    let lastRawMarkdown: string | null = $state(null);
    let lastRawHtml: string | null = $state(null);
    let lastSanitizedHtml: string | null = $state(null);

    // --- Markdown safety helpers ---
    // escape HTML for attributes
    function escapeHtml(s: string) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function isSafeHref(href: string | undefined) {
        if (!href) return false;
        try {
            // Use URL to parse relative URLs too (base becomes http://example)
            const u = new URL(href, 'http://example');
            const p = u.protocol.toLowerCase();
            if (p === 'http:' || p === 'https:' || p === 'mailto:') return true;
            // allow data images
            if (p === 'data:' && /^data:image\//i.test(href)) return true;
            return false;
        } catch (e) {
            return false;
        }
    }

    function sanitizeDom(template: HTMLTemplateElement) {
        const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT, null);
        while (walker.nextNode()) {
            const el = walker.currentNode as Element;
            const tag = el.tagName.toLowerCase();
            // remove script and style elements
            if (tag === 'script' || tag === 'style') {
                el.remove();
                continue;
            }

            // remove event handler attributes and javascript: protocols
            for (const attr of Array.from(el.attributes)) {
                const name = attr.name.toLowerCase();
                const val = attr.value;
                if (name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                    continue;
                }
                if ((name === 'href' || name === 'src') && /^javascript:/i.test(val)) {
                    el.removeAttribute(attr.name);
                    continue;
                }
            }

            // Post-process anchors: only allow http(s), mailto, and data:image; set target/rel
            if (tag === 'a') {
                const href = el.getAttribute('href') ?? '';
                if (isSafeHref(href)) {
                    el.setAttribute('target', '_blank');
                    el.setAttribute('rel', 'noopener noreferrer');
                } else {
                    el.setAttribute('href', '#');
                    el.removeAttribute('target');
                    el.removeAttribute('rel');
                }
            }

            // Post-process images: only allow safe src
            if (tag === 'img') {
                const src = el.getAttribute('src') ?? '';
                if (!isSafeHref(src)) {
                    el.removeAttribute('src');
                }
            }
        }
    }

    async function parseAndSanitize(markdownText: string) {
        // Parse markdown to HTML, then sanitize the generated DOM
            // Debug / diagnostics: keep raw inputs to help troubleshoot rendering
            try {
                lastRawMarkdown = markdownText;
            } catch (e) { /* ignore */ }

            // Parse markdown to HTML, then sanitize the generated DOM
            const raw = await marked.parse(markdownText, { gfm: true, breaks: true });
            lastRawHtml = raw as string;
            const template = document.createElement('template');
            template.innerHTML = raw;
            sanitizeDom(template);
            const out = template.innerHTML;
            // store sanitized HTML for debugging
            lastSanitizedHtml = out;
            console.debug('parseAndSanitize: raw length=', (raw as string).length, 'sanitized length=', out.length);
            return out;
    }

    async function onFileChange(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input?.files?.[0];
        if (!file) {
            return;
        }
        console.log("Opening " + file.type + " (" + (file.name ?? '') + ")");

        // Revoke previous object URL if any
        if (_prevUrl) {
            try { URL.revokeObjectURL(_prevUrl); } catch (err) { /* ignore */ }
            _prevUrl = null;
        }

        // Clear previous previews
        pdfUrl = null;
        imgUrl = null;
        markdownHtml = null;

        // handle PDFs
        if (file.type === 'application/pdf') {
            const url = URL.createObjectURL(file);
            pdfUrl = url;
            _prevUrl = url;
            return;
        }

        // handle images
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            imgUrl = url;
            _prevUrl = url;
            return;
        }

        // handle markdown (by extension or MIME)
        const name = file.name ?? '';
        const isMarkdownExt = /\.(md|markdown)$/i.test(name);
        const isMarkdownType = file.type === 'text/markdown' || (file.type.startsWith('text/') && isMarkdownExt);
                if (isMarkdownExt || isMarkdownType) {
            try {
                const text = await file.text();
                // parse to HTML via marked and sanitize
                markdownHtml = await parseAndSanitize(text);
            } catch (err) {
                console.warn('Failed to read markdown file', err);
                markdownHtml = '<pre>Failed to read file</pre>';
            }
            return;
        }

        // fallback: try to read as text and render as markdown
        try {
            const text = await file.text();
            markdownHtml = await parseAndSanitize(text);
        } catch (err) {
            console.warn('Unsupported file type and failed to read as text', err);
        }
    }

    function onUrlInput(e: Event) {
        const input = e.target as HTMLInputElement;
        urlInput = input?.value ?? '';
    }

    function onUrlKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            loadUrl();
        }
    }

    function loadUrl() {
        // basic validation via URL constructor; allow http and https only
        try {
            const candidate = urlInput.trim();
            if (!candidate) return;
            const u = new URL(candidate.includes('://') ? candidate : `https://${candidate}`);
            if (u.protocol !== 'http:' && u.protocol !== 'https:') {
                console.warn('Unsupported protocol for iframe:', u.protocol);
                return;
            }
            iframeUrl = u.toString();
            // create or update a BrowserView in the main process
            if (!viewId) {
                viewId = `pane-view-${paneData.uuid}`;
                // create view (main process will attach to the main window)
                // initial bounds will be updated immediately by updateView after measuring
                //window.viewApi.createView(viewId, iframeUrl, { x: 0, y: 0, width: width, height: height }).catch((e: Error) => console.warn(e));
            } else {
                //swindow.viewApi.createView(viewId, iframeUrl, { x: 0, y: 0, width: width, height: height }).catch((e: Error) => console.warn(e));
            }
            // clear other previews
            pdfUrl = null;
            imgUrl = null;
            markdownHtml = null;
        } catch (err) {
            console.warn('Invalid URL:', urlInput, err);
        }
    }

    // measure and update view bounds whenever the pane moves or resizes
    function updateViewBounds() {
        if (!viewId || !paneElement) return;
        const rect = paneElement.getBoundingClientRect();
        // Convert to device pixels if necessary; use rect directly for now
        window.viewApi.updateView(viewId, { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) }).catch((e: Error) => console.warn(e));
    }

    /*onMount(() => {
        // watch for layout changes
        const ro = new ResizeObserver(() => updateViewBounds());
        if (paneElement) ro.observe(paneElement);
        // also update periodically while dragging
        const interval = setInterval(() => updateViewBounds(), 250);
        return () => {
            ro.disconnect();
            clearInterval(interval);
            if (viewId) {
                window.viewApi.destroyView(viewId).catch((e: Error) => console.warn(e));
                viewId = null;
            }
        };
    });*/

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    style="
	left: {xOffset - (width - unscaledWidth) / 2}px;
	top: {yOffset - (height - unscaledHeight) / 2}px;
	width: {width}px;
	height: {height}px;
    box-sizing: border-box;
    -moz-box-sizing: border-box;
    -webkit-box-sizing: border-box;
    border: 5px solid {borderColor};
    border-radius: 25px;
    overflow: hidden;
    z-index: 50;
	"
    class="
    pane-{paneData.uuid}
    absolute
    bg-slate-500
    {isSelected ? 'ring-4 ring-blue-500 ring-opacity-75' : ''}
    "
    {onmouseenter}
    {onmouseleave}
    {onmousedown}
    {onmouseup}
    {onmousemove}
>
    <div class="        
        flex justify-center items-center text-center w-full h-full text-slate-50" style="min-height: 0;" >
        <!-- PDF preview (renders when a PDF is selected) -->
        {#if pdfUrl}
            <div style="
            width: {width}px;
            height: {height}px;
            "
            class="border border-gray-300 absolute
            ">
                <object title="PDF preview" data={pdfUrl + "#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0"} type="application/pdf" width="100%" height="100%">
                    <p>PDF preview not available.</p>
                </object>
            </div>
        {:else if imgUrl}
            <img src="{imgUrl}" alt="" style="
            user-drag: none;
            user-select: none;"/>
        {:else if markdownHtml}
            <div class="markdown-preview w-full h-full overflow-auto text-left p-4 bg-white text-black" style="box-sizing: border-box;">
                {@html markdownHtml}
                <!-- Debug info to help diagnose rendering issues -->
                <details style="margin-top:8px; color:#334155; background:#f8fafc; padding:8px; border-radius:6px;">
                    <summary style="cursor:pointer;">Debug: markdown parse info</summary>
                    <div style="font-size:12px; margin-top:8px;">
                        <div>raw markdown length: {lastRawMarkdown ? lastRawMarkdown.length : 0}</div>
                        <div>raw html length: {lastRawHtml ? lastRawHtml.length : 0}</div>
                        <div>sanitized html length: {lastSanitizedHtml ? lastSanitizedHtml.length : 0}</div>
                    </div>
                </details>
            </div>
        {:else if iframeUrl}
            <!-- Use Electron's <webview> to embed web content in the renderer -->
            <!-- Wrap the webview in a positioned container with overflow:hidden so it cannot escape the pane bounds -->
            <div class="webview-container" style="min-width: 100%; min-height: 100%;">
                <webview title="Loaded webpage preview" src={iframeUrl} style="width: {width}px; height: {height}px;" preload="" ></webview>
            </div>
        {:else}
            <!-- PDF upload input -->
            <div class="block gap-2">
                <!-- Pane size inputs -->
                <div class="mt-5 mx-60 flex items-center">
                    <label class="text-sm text-gray-100"></label>
                    <input type="number" min="1" class="px-2 py-1 rounded bg-slate-500 text-gray-50 w-20" value={paneData.paneSize[0]} oninput={onPaneWidthInput} />
                    <label class="text-sm text-gray-100"></label>
                    <input type="number" min="1" class="px-2 py-1 rounded bg-slate-500 text-gray-50 w-20" value={paneData.paneSize[1]} oninput={onPaneHeightInput} />
                </div>
                <div class="grow justify-center items-center">
                    <label for="pdf-input-{paneData.uuid}" class="text-sm block mx-50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="{width/3}" height="{width/3}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-file"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /></svg>
                    </label>
                    <input 
                    id="pdf-input-{paneData.uuid}"
                    type="file"
                    accept="*"
                    onchange={onFileChange}
                    class="mt-1 hidden" />
                </div>
                <!-- URL loader -->
                <input type="text" placeholder="https://example.com" class="px-2 py-1 rounded bg-slate-500 text-gray-50" value={urlInput} oninput={onUrlInput} onkeydown={onUrlKeydown} />
                
            </div>

        {/if}
    </div>
</div>
