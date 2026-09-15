/*
    ============================================================
    CONFIGURATION
    ============================================================
*/

const OWNER = "alatheesh";
const REPO = "copy";
const BRANCH = "main";
const ROOT_FOLDER = "";


/*
    ============================================================
    ELEMENTS
    ============================================================
*/

const fileList = document.getElementById("fileList");
const codeEditor = document.getElementById("codeEditor");
const lineNumbers = document.getElementById("lineNumbers");
const currentFile = document.getElementById("currentFile");
const copyButton = document.getElementById("copyButton");
const resetButton = document.getElementById("resetButton");
const refreshButton = document.getElementById("refreshButton");
const statusText = document.getElementById("statusText");
const cursorPosition = document.getElementById("cursorPosition");

const imagePreview = document.getElementById("imagePreview");
const previewImage = document.getElementById("previewImage");
const imageFileName = document.getElementById("imageFileName");
const imageRawLink = document.getElementById("imageRawLink");

const websiteZoomOut =
    document.getElementById("websiteZoomOut");

const websiteZoomReset =
    document.getElementById("websiteZoomReset");

const websiteZoomIn =
    document.getElementById("websiteZoomIn");

const imageZoomOut =
    document.getElementById("imageZoomOut");

const imageZoomReset =
    document.getElementById("imageZoomReset");

const imageZoomIn =
    document.getElementById("imageZoomIn");


/*
    ============================================================
    STATE
    ============================================================
*/

let files = [];
let selectedFile = null;
let originalCode = "";


/*
    ============================================================
    WEBSITE ZOOM STATE
    ============================================================
*/

let websiteZoom =
    Number(
        localStorage.getItem("website-zoom")
    ) || 100;


/*
    ============================================================
    IMAGE ZOOM + PAN STATE
    ============================================================
*/

let imageZoom = 100;

let imagePositionX = 0;
let imagePositionY = 0;

let isDraggingImage = false;

let dragStartX = 0;
let dragStartY = 0;

let dragStartPositionX = 0;
let dragStartPositionY = 0;


/*
    ============================================================
    HIDDEN FILES
    ============================================================
*/

const HIDDEN_FILES = [
    "index.html",
    "style.css",
    "script.js",
    "README.md",
    "README",
    "LICENSE",
    "LICENSE.md",
    "LICENSE.txt"
];


/*
    ============================================================
    IMAGE EXTENSIONS
    ============================================================
*/

const IMAGE_EXTENSIONS = [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "svg",
    "bmp",
    "ico",
    "avif"
];


function isImageFile(fileName) {

    const extension =
        fileName
            .split(".")
            .pop()
            .toLowerCase();

    return IMAGE_EXTENSIONS.includes(
        extension
    );
}


/*
    ============================================================
    WEBSITE ZOOM
    ============================================================
*/

function setWebsiteZoom(value) {

    websiteZoom =
        Math.min(
            150,
            Math.max(
                70,
                value
            )
        );

    document.body.style.zoom =
        `${websiteZoom}%`;

    if (websiteZoomReset) {

        websiteZoomReset.textContent =
            `${websiteZoom}%`;
    }

    localStorage.setItem(
        "website-zoom",
        websiteZoom
    );
}


/*
    ============================================================
    UPDATE IMAGE TRANSFORM
    ============================================================
*/

function updateImageTransform() {

    if (!previewImage) {
        return;
    }

    const scale =
        imageZoom / 100;

    previewImage.style.transform =
        `translate3d(${imagePositionX}px, ${imagePositionY}px, 0) ` +
        `scale(${scale})`;
}


/*
    ============================================================
    IMAGE ZOOM
    ============================================================
*/

function setImageZoom(
    value,
    keepPosition = true
) {

    const oldZoom =
        imageZoom;

    imageZoom =
        Math.min(
            400,
            Math.max(
                25,
                value
            )
        );

    /*
        If the image is being returned to 100%,
        center it automatically.
    */

    if (
        imageZoom === 100 &&
        oldZoom !== 100
    ) {

        imagePositionX = 0;
        imagePositionY = 0;
    }

    /*
        If requested, preserve the current
        image position while zooming.
    */

    if (!keepPosition) {

        imagePositionX = 0;
        imagePositionY = 0;
    }

    updateImageTransform();

    if (previewImage) {

        if (imageZoom > 100) {

            previewImage.style.cursor =
                isDraggingImage
                    ? "grabbing"
                    : "grab";
        }

        else {

            previewImage.style.cursor =
                "default";
        }
    }

    if (imageZoomReset) {

        imageZoomReset.textContent =
            `${imageZoom}%`;
    }
}


/*
    ============================================================
    RESET IMAGE VIEW
    ============================================================
*/

function resetImageView() {

    imageZoom = 100;

    imagePositionX = 0;
    imagePositionY = 0;

    isDraggingImage = false;

    updateImageTransform();

    if (imageZoomReset) {

        imageZoomReset.textContent =
            "100%";
    }

    if (previewImage) {

        previewImage.style.cursor =
            "default";
    }
}


/*
    ============================================================
    GITHUB API
    ============================================================
*/

async function getRepositoryFiles(
    path = ""
) {

    const url =
        `https://api.github.com/repos/` +
        `${OWNER}/${REPO}/contents/${path}` +
        `?ref=${encodeURIComponent(BRANCH)}`;

    const response =
        await fetch(url);

    if (!response.ok) {

        throw new Error(
            `GitHub returned ${response.status}`
        );
    }

    return await response.json();
}


/*
    ============================================================
    LOAD FILES
    ============================================================
*/

async function loadFiles() {

    hideImage();

    fileList.innerHTML = `
        <div class="loading">
            Loading files...
        </div>
    `;

    files = [];

    try {

        await scanDirectory(
            ROOT_FOLDER
        );

        files =
            files.filter(
                file => {

                    const fileName =
                        file.path
                            .split("/")
                            .pop()
                            .toLowerCase();

                    return !HIDDEN_FILES.some(
                        hidden =>
                            hidden.toLowerCase() ===
                            fileName
                    );
                }
            );

        files.sort(
            (a, b) =>
                a.path.localeCompare(
                    b.path,
                    undefined,
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                )
        );

        buildFileTree();

        if (files.length === 0) {

            fileList.innerHTML = `
                <div class="loading">
                    No files found.
                </div>
            `;

            statusText.textContent =
                "No files found";

            return;
        }

        statusText.textContent =
            `${files.length} file(s) found`;

    }

    catch (error) {

        console.error(error);

        fileList.innerHTML = `
            <div class="error">
                Could not load GitHub files.
                <br><br>
                Check your username, repository name,
                branch, and repository visibility.
            </div>
        `;

        statusText.textContent =
            "Error loading files";
    }
}


/*
    ============================================================
    RECURSIVELY SCAN DIRECTORIES
    ============================================================
*/

async function scanDirectory(
    path
) {

    const items =
        await getRepositoryFiles(
            path
        );

    for (const item of items) {

        if (item.type === "file") {

            files.push({
                name: item.name,
                path: item.path,
                download_url: item.download_url
            });
        }

        else if (item.type === "dir") {

            await scanDirectory(
                item.path
            );
        }
    }
}


/*
    ============================================================
    BUILD FOLDER TREE
    ============================================================
*/

function buildFileTree() {

    fileList.innerHTML = "";

    const root = {
        folders: {},
        files: []
    };

    for (const file of files) {

        const parts =
            file.path.split("/");

        let current =
            root;

        for (
            let i = 0;
            i < parts.length - 1;
            i++
        ) {

            const folderName =
                parts[i];

            if (!current.folders[folderName]) {

                current.folders[folderName] = {
                    folders: {},
                    files: []
                };
            }

            current =
                current.folders[
                    folderName
                ];
        }

        current.files.push(
            file
        );
    }

    renderTree(
        root,
        fileList,
        0
    );
}


/*
    ============================================================
    RENDER TREE
    ============================================================
*/

function renderTree(
    node,
    container,
    depth
) {

    const folders =
        Object.keys(
            node.folders
        ).sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    undefined,
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                )
        );

    const sortedFiles =
        [...node.files].sort(
            (a, b) =>
                a.name.localeCompare(
                    b.name,
                    undefined,
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                )
        );

    for (
        const folderName of folders
    ) {

        const folder =
            node.folders[
                folderName
            ];

        const folderWrapper =
            document.createElement(
                "div"
            );

        folderWrapper.className =
            "folder-wrapper";

        const folderButton =
            document.createElement(
                "button"
            );

        folderButton.className =
            "folder-item";

        folderButton.style.paddingLeft =
            `${10 + depth * 18}px`;

        const arrow =
            document.createElement(
                "span"
            );

        arrow.className =
            "folder-arrow";

        arrow.textContent =
            "▶";

        const icon =
            document.createElement(
                "span"
            );

        icon.className =
            "folder-icon";

        icon.textContent =
            "📁";

        const name =
            document.createElement(
                "span"
            );

        name.className =
            "folder-name";

        name.textContent =
            folderName;

        folderButton.appendChild(
            arrow
        );

        folderButton.appendChild(
            icon
        );

        folderButton.appendChild(
            name
        );

        const children =
            document.createElement(
                "div"
            );

        children.className =
            "folder-children";

        children.style.display =
            "none";

        folderButton.addEventListener(
            "click",
            () => {

                const isOpen =
                    folderButton.classList.contains(
                        "open"
                    );

                if (isOpen) {

                    folderButton.classList.remove(
                        "open"
                    );

                    children.style.display =
                        "none";
                }

                else {

                    folderButton.classList.add(
                        "open"
                    );

                    children.style.display =
                        "block";
                }
            }
        );

        folderWrapper.appendChild(
            folderButton
        );

        folderWrapper.appendChild(
            children
        );

        container.appendChild(
            folderWrapper
        );

        renderTree(
            folder,
            children,
            depth + 1
        );
    }

    for (
        const file of sortedFiles
    ) {

        const button =
            document.createElement(
                "button"
            );

        button.className =
            "file-item";

        button.style.paddingLeft =
            `${30 + depth * 18}px`;

        button.dataset.path =
            file.path;

        const icon =
            document.createElement(
                "span"
            );

        icon.className =
            "file-icon";

        icon.textContent =
            getFileIcon(
                file.name
            );

        const name =
            document.createElement(
                "span"
            );

        name.className =
            "file-name";

        name.textContent =
            file.name;

        button.appendChild(
            icon
        );

        button.appendChild(
            name
        );

        button.title =
            file.path;

        button.addEventListener(
            "click",
            () => {

                openFile(
                    file
                );
            }
        );

        container.appendChild(
            button
        );
    }
}


/*
    ============================================================
    FILE ICONS
    ============================================================
*/

function getFileIcon(
    fileName
) {

    const extension =
        fileName
            .split(".")
            .pop()
            .toLowerCase();

    const icons = {

        js: "🟨",
        jsx: "⚛️",
        ts: "🔷",
        tsx: "⚛️",

        py: "🐍",

        java: "☕",

        c: "🔵",
        cpp: "🔵",
        h: "🔵",
        hpp: "🔵",

        ino: "🔌",

        html: "🌐",
        htm: "🌐",

        css: "🎨",
        scss: "🎨",

        json: "🧾",
        xml: "🧾",

        php: "🐘",

        rb: "💎",

        go: "🐹",

        rs: "🦀",

        swift: "🍎",

        kt: "🟣",

        sql: "🗄️",

        sh: "💻",
        bat: "💻",

        md: "📝",
        txt: "📄",

        png: "🖼️",
        jpg: "🖼️",
        jpeg: "🖼️",
        gif: "🖼️",
        webp: "🖼️",
        svg: "🖼️",
        bmp: "🖼️",
        ico: "🖼️",
        avif: "🖼️"
    };

    return (
        icons[extension] ||
        "📄"
    );
}


/*
    ============================================================
    OPEN FILE
    ============================================================
*/

async function openFile(
    file
) {

    try {

        statusText.textContent =
            "Loading...";

        selectedFile =
            file;

        currentFile.textContent =
            file.path;

        highlightSelectedFile();

        /*
            IMAGE FILE
        */

        if (
            isImageFile(
                file.name
            )
        ) {

            showImage(
                file
            );

            return;
        }

        /*
            NORMAL FILE
        */

        hideImage();

        const response =
            await fetch(
                file.download_url
            );

        if (!response.ok) {

            throw new Error(
                "Could not download file."
            );
        }

        const code =
            await response.text();

        originalCode =
            code;

        const savedCode =
            localStorage.getItem(
                `code-editor-${file.path}`
            );

        if (
            savedCode !== null
        ) {

            codeEditor.value =
                savedCode;
        }

        else {

            codeEditor.value =
                code;
        }

        codeEditor.disabled =
            false;

        copyButton.disabled =
            false;

        resetButton.disabled =
            false;

        updateLineNumbers();

        updateCursorPosition();

        statusText.textContent =
            "Loaded";
    }

    catch (error) {

        console.error(
            error
        );

        statusText.textContent =
            "Could not load file";
    }
}


/*
    ============================================================
    SHOW IMAGE
    ============================================================
*/

function showImage(
    file
) {

    if (
        !imagePreview ||
        !previewImage
    ) {

        console.error(
            "Image preview elements are missing from HTML."
        );

        return;
    }

    /*
        Hide code editor.
    */

    codeEditor.style.display =
        "none";

    lineNumbers.style.display =
        "none";

    /*
        Disable code buttons.
    */

    codeEditor.disabled =
        true;

    copyButton.disabled =
        true;

    resetButton.disabled =
        true;

    /*
        Reset zoom and position
        for newly selected image.
    */

    resetImageView();

    /*
        Show image preview.
    */

    imagePreview.hidden =
        false;

    if (imageFileName) {

        imageFileName.textContent =
            file.path;
    }

    /*
        GitHub direct image URL.
    */

    previewImage.src =
        file.download_url;

    previewImage.alt =
        file.name;

    if (imageRawLink) {

        imageRawLink.href =
            file.download_url;
    }

    statusText.textContent =
        "Image preview";

    /*
        Update cursor after image loads.
    */

    previewImage.onload =
        () => {

            updateImageTransform();

            previewImage.style.cursor =
                imageZoom > 100
                    ? "grab"
                    : "default";
        };

    previewImage.onerror =
        () => {

            statusText.textContent =
                "Could not display image";
        };
}


/*
    ============================================================
    HIDE IMAGE
    ============================================================
*/

function hideImage() {

    if (!imagePreview) {

        codeEditor.style.display =
            "";

        lineNumbers.style.display =
            "";

        return;
    }

    /*
        Stop any active drag.
    */

    isDraggingImage =
        false;

    /*
        Hide image preview.
    */

    imagePreview.hidden =
        true;

    /*
        Remove image source.
    */

    if (previewImage) {

        previewImage.removeAttribute(
            "src"
        );

        previewImage.style.transform =
            "translate3d(0, 0, 0) scale(1)";

        previewImage.style.cursor =
            "default";
    }

    /*
        Reset image state.
    */

    imageZoom = 100;

    imagePositionX = 0;
    imagePositionY = 0;

    if (imageZoomReset) {

        imageZoomReset.textContent =
            "100%";
    }

    /*
        Reset raw image link.
    */

    if (imageRawLink) {

        imageRawLink.href =
            "#";
    }

    /*
        Restore editor.
    */

    codeEditor.style.display =
        "";

    lineNumbers.style.display =
        "";

    codeEditor.disabled =
        false;
}


/*
    ============================================================
    IMAGE DRAG / PAN
    ============================================================
*/

if (previewImage) {

    /*
        Start dragging.
    */

    previewImage.addEventListener(
        "mousedown",
        event => {

            /*
                Only left mouse button.
            */

            if (
                event.button !== 0
            ) {
                return;
            }

            /*
                Do not drag at 100% or below.
            */

            if (
                imageZoom <= 100
            ) {
                return;
            }

            event.preventDefault();

            isDraggingImage =
                true;

            dragStartX =
                event.clientX;

            dragStartY =
                event.clientY;

            dragStartPositionX =
                imagePositionX;

            dragStartPositionY =
                imagePositionY;

            previewImage.style.cursor =
                "grabbing";

            previewImage.classList.add(
                "is-dragging"
            );
        }
    );


    /*
        Move image while dragging.
    */

    document.addEventListener(
        "mousemove",
        event => {

            if (
                !isDraggingImage
            ) {
                return;
            }

            event.preventDefault();

            const deltaX =
                event.clientX -
                dragStartX;

            const deltaY =
                event.clientY -
                dragStartY;

            imagePositionX =
                dragStartPositionX +
                deltaX;

            imagePositionY =
                dragStartPositionY +
                deltaY;

            updateImageTransform();
        }
    );


    /*
        Stop dragging.
    */

    document.addEventListener(
        "mouseup",
        () => {

            if (
                !isDraggingImage
            ) {
                return;
            }

            isDraggingImage =
                false;

            previewImage.classList.remove(
                "is-dragging"
            );

            previewImage.style.cursor =
                imageZoom > 100
                    ? "grab"
                    : "default";
        }
    );


    /*
        Prevent browser image dragging.
    */

    previewImage.addEventListener(
        "dragstart",
        event => {

            event.preventDefault();
        }
    );
}


/*
    ============================================================
    IMAGE MOUSE-WHEEL ZOOM
    ============================================================
*/

if (imagePreview) {

    imagePreview.addEventListener(
        "wheel",
        event => {

            if (
                imagePreview.hidden
            ) {
                return;
            }

            event.preventDefault();

            /*
                Normal wheel:
                25% steps.

                Ctrl + wheel:
                10% steps for finer control.
            */

            const step =
                event.ctrlKey
                    ? 10
                    : 25;

            if (
                event.deltaY < 0
            ) {

                setImageZoom(
                    imageZoom + step
                );
            }

            else {

                setImageZoom(
                    imageZoom - step
                );
            }

        },
        {
            passive: false
        }
    );
}


/*
    ============================================================
    IMAGE ZOOM BUTTONS
    ============================================================
*/

if (imageZoomOut) {

    imageZoomOut.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            setImageZoom(
                imageZoom - 25
            );
        }
    );
}


if (imageZoomIn) {

    imageZoomIn.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            setImageZoom(
                imageZoom + 25
            );
        }
    );
}


if (imageZoomReset) {

    imageZoomReset.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            setImageZoom(
                100
            );
        }
    );
}


/*
    ============================================================
    HIGHLIGHT ACTIVE FILE
    ============================================================
*/

function highlightSelectedFile() {

    const buttons =
        fileList.querySelectorAll(
            ".file-item"
        );

    buttons.forEach(
        button => {

            button.classList.remove(
                "active"
            );

            if (
                selectedFile &&
                button.dataset.path ===
                selectedFile.path
            ) {

                button.classList.add(
                    "active"
                );
            }
        }
    );
}


/*
    ============================================================
    COPY
    ============================================================
*/

copyButton.addEventListener(
    "click",
    async () => {

        if (
            codeEditor.disabled
        ) {
            return;
        }

        try {

            await navigator.clipboard.writeText(
                codeEditor.value
            );

            statusText.textContent =
                "Copied!";

            setTimeout(
                () => {

                    statusText.textContent =
                        "Ready";

                },
                1500
            );

        }

        catch (error) {

            codeEditor.select();

            document.execCommand(
                "copy"
            );

            statusText.textContent =
                "Copied!";
        }
    }
);


/*
    ============================================================
    RESET
    ============================================================
*/

resetButton.addEventListener(
    "click",
    () => {

        if (
            !selectedFile ||
            isImageFile(
                selectedFile.name
            )
        ) {
            return;
        }

        codeEditor.value =
            originalCode;

        localStorage.removeItem(
            `code-editor-${selectedFile.path}`
        );

        updateLineNumbers();

        updateCursorPosition();

        statusText.textContent =
            "Reset to original";
    }
);


/*
    ============================================================
    LOCAL EDITING
    ============================================================
*/

codeEditor.addEventListener(
    "input",
    () => {

        if (
            !selectedFile ||
            isImageFile(
                selectedFile.name
            )
        ) {
            return;
        }

        localStorage.setItem(
            `code-editor-${selectedFile.path}`,
            codeEditor.value
        );

        updateLineNumbers();

        statusText.textContent =
            "Edited";
    }
);


/*
    ============================================================
    TAB SUPPORT
    ============================================================
*/

codeEditor.addEventListener(
    "keydown",
    event => {

        if (
            event.key !== "Tab"
        ) {
            return;
        }

        event.preventDefault();

        const start =
            codeEditor.selectionStart;

        const end =
            codeEditor.selectionEnd;

        const value =
            codeEditor.value;

        codeEditor.value =
            value.substring(
                0,
                start
            ) +
            "    " +
            value.substring(
                end
            );

        codeEditor.selectionStart =
            start + 4;

        codeEditor.selectionEnd =
            start + 4;

        codeEditor.dispatchEvent(
            new Event("input")
        );
    }
);


/*
    ============================================================
    LINE NUMBERS
    ============================================================
*/

function updateLineNumbers() {

    const lineCount =
        codeEditor.value
            .split("\n")
            .length;

    let numbers = "";

    for (
        let i = 1;
        i <= lineCount;
        i++
    ) {

        numbers +=
            i + "\n";
    }

    lineNumbers.textContent =
        numbers;
}


/*
    ============================================================
    SYNCHRONIZE SCROLL
    ============================================================
*/

codeEditor.addEventListener(
    "scroll",
    () => {

        lineNumbers.scrollTop =
            codeEditor.scrollTop;
    }
);


/*
    ============================================================
    CURSOR POSITION
    ============================================================
*/

function updateCursorPosition() {

    const position =
        codeEditor.selectionStart;

    const beforeCursor =
        codeEditor.value.substring(
            0,
            position
        );

    const lines =
        beforeCursor.split(
            "\n"
        );

    const line =
        lines.length;

    const column =
        lines[
            lines.length - 1
        ].length + 1;

    cursorPosition.textContent =
        `Ln ${line}, Col ${column}`;
}


codeEditor.addEventListener(
    "keyup",
    updateCursorPosition
);


codeEditor.addEventListener(
    "click",
    updateCursorPosition
);


codeEditor.addEventListener(
    "select",
    updateCursorPosition
);


/*
    ============================================================
    WEBSITE ZOOM BUTTONS
    ============================================================
*/

if (websiteZoomOut) {

    websiteZoomOut.addEventListener(
        "click",
        () => {

            setWebsiteZoom(
                websiteZoom - 10
            );
        }
    );
}


if (websiteZoomIn) {

    websiteZoomIn.addEventListener(
        "click",
        () => {

            setWebsiteZoom(
                websiteZoom + 10
            );
        }
    );
}


if (websiteZoomReset) {

    websiteZoomReset.addEventListener(
        "click",
        () => {

            setWebsiteZoom(
                100
            );
        }
    );
}


/*
    ============================================================
    KEYBOARD SHORTCUTS
    ============================================================
*/

document.addEventListener(
    "keydown",
    event => {

        /*
            Website zoom.
        */

        if (
            event.ctrlKey &&
            (
                event.key === "+" ||
                event.key === "="
            )
        ) {

            event.preventDefault();

            setWebsiteZoom(
                websiteZoom + 10
            );
        }


        if (
            event.ctrlKey &&
            event.key === "-"
        ) {

            event.preventDefault();

            setWebsiteZoom(
                websiteZoom - 10
            );
        }


        if (
            event.ctrlKey &&
            event.key === "0"
        ) {

            event.preventDefault();

            setWebsiteZoom(
                100
            );
        }
    }
);


/*
    ============================================================
    REFRESH
    ============================================================
*/

refreshButton.addEventListener(
    "click",
    () => {

        hideImage();

        selectedFile =
            null;

        currentFile.textContent =
            "Select a file";

        copyButton.disabled =
            true;

        resetButton.disabled =
            true;

        loadFiles();
    }
);


/*
    ============================================================
    INITIALIZE
    ============================================================
*/

setWebsiteZoom(
    websiteZoom
);

resetImageView();


/*
    ============================================================
    START
    ============================================================
*/

loadFiles();
