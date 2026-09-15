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


/*
    Image preview elements.
    These only work when your HTML contains the image
    preview section.
*/

const imagePreview = document.getElementById("imagePreview");
const previewImage = document.getElementById("previewImage");
const imageFileName = document.getElementById("imageFileName");
const imageRawLink = document.getElementById("imageRawLink");


/*
    Website zoom controls.
*/

const websiteZoomOut =
    document.getElementById("websiteZoomOut");

const websiteZoomReset =
    document.getElementById("websiteZoomReset");

const websiteZoomIn =
    document.getElementById("websiteZoomIn");


/*
    Image zoom controls.
*/

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
    Image zoom is reset to 100% whenever
    a new image is opened.
*/

let imageZoom = 100;


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

    /*
        Keep website zoom between 70% and 150%.
    */

    websiteZoom =
        Math.min(
            150,
            Math.max(
                70,
                value
            )
        );


    /*
        Zoom the complete website.
    */

    document.body.style.zoom =
        `${websiteZoom}%`;


    /*
        Update button text.
    */

    if (websiteZoomReset) {

        websiteZoomReset.textContent =
            `${websiteZoom}%`;

    }


    /*
        Remember the zoom.
    */

    localStorage.setItem(
        "website-zoom",
        websiteZoom
    );
}


/*
    ============================================================
    IMAGE ZOOM
    ============================================================
*/

function setImageZoom(value) {

    /*
        Keep image zoom between 25% and 400%.
    */

    imageZoom =
        Math.min(
            400,
            Math.max(
                25,
                value
            )
        );


    /*
        If image exists, scale it.
    */

    if (previewImage) {

        previewImage.style.transform =
            `scale(${imageZoom / 100})`;


        /*
            Change mouse cursor.
        */

        previewImage.style.cursor =
            imageZoom > 100
                ? "zoom-out"
                : "zoom-in";
    }


    /*
        Update percentage button.
    */

    if (imageZoomReset) {

        imageZoomReset.textContent =
            `${imageZoom}%`;

    }
}


/*
    ============================================================
    GITHUB API
    ============================================================
*/

async function getRepositoryFiles(path = "") {

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

    /*
        Hide any image that may currently be open.
    */

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


        /*
            Remove hidden files.
        */

        files =
            files.filter(file => {

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

            });


        /*
            Sort files.
        */

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


        /*
            Build explorer.
        */

        buildFileTree();


        /*
            No files.
        */

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

async function scanDirectory(path) {

    const items =
        await getRepositoryFiles(path);


    for (const item of items) {

        /*
            FILE
        */

        if (item.type === "file") {

            files.push({

                name: item.name,

                path: item.path,

                download_url: item.download_url

            });

        }


        /*
            DIRECTORY
        */

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


    /*
        Put files into tree.
    */

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


            if (
                !current.folders[folderName]
            ) {

                current.folders[folderName] = {

                    folders: {},

                    files: []

                };

            }


            current =
                current.folders[folderName];

        }


        current.files.push(file);

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

    /*
        Sort folders.
    */

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


    /*
        Sort files.
    */

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


    /*
        ========================================================
        FOLDERS
        ========================================================
    */

    for (
        const folderName of folders
    ) {

        const folder =
            node.folders[folderName];


        const folderWrapper =
            document.createElement(
                "div"
            );


        folderWrapper.className =
            "folder-wrapper";


        /*
            Folder button.
        */

        const folderButton =
            document.createElement(
                "button"
            );


        folderButton.className =
            "folder-item";


        folderButton.style.paddingLeft =
            `${10 + depth * 18}px`;


        /*
            Arrow.
        */

        const arrow =
            document.createElement(
                "span"
            );


        arrow.className =
            "folder-arrow";


        arrow.textContent =
            "▶";


        /*
            Folder icon.
        */

        const icon =
            document.createElement(
                "span"
            );


        icon.className =
            "folder-icon";


        icon.textContent =
            "📁";


        /*
            Folder name.
        */

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


        /*
            Folder children.
        */

        const children =
            document.createElement(
                "div"
            );


        children.className =
            "folder-children";


        children.style.display =
            "none";


        /*
            Open / close folder.
        */

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


        /*
            Render contents.
        */

        renderTree(
            folder,
            children,
            depth + 1
        );

    }


    /*
        ========================================================
        FILES
        ========================================================
    */

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


        /*
            Store path.
        */

        button.dataset.path =
            file.path;


        /*
            File icon.
        */

        const icon =
            document.createElement(
                "span"
            );


        icon.className =
            "file-icon";


        icon.textContent =
            getFileIcon(file.name);


        /*
            File name.
        */

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


        /*
            Open selected file.
        */

        button.addEventListener(
            "click",
            () => {

                openFile(file);

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

function getFileIcon(fileName) {

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


    return icons[extension] || "📄";
}


/*
    ============================================================
    OPEN FILE
    ============================================================
*/

async function openFile(file) {

    try {

        statusText.textContent =
            "Loading...";


        selectedFile =
            file;


        currentFile.textContent =
            file.path;


        highlightSelectedFile();


        /*
            ====================================================
            IMAGE FILE
            ====================================================
        */

        if (
            isImageFile(file.name)
        ) {

            showImage(file);

            return;
        }


        /*
            ====================================================
            NORMAL CODE / TEXT FILE
            ====================================================
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


        /*
            Load local edited version.
        */

        const savedCode =
            localStorage.getItem(
                `code-editor-${file.path}`
            );


        if (savedCode !== null) {

            codeEditor.value =
                savedCode;

        }

        else {

            codeEditor.value =
                code;

        }


        /*
            Enable editor.
        */

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

        console.error(error);


        statusText.textContent =
            "Could not load file";

    }
}


/*
    ============================================================
    SHOW IMAGE
    ============================================================
*/

function showImage(file) {

    /*
        Safety check.
    */

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
        ONLY NOW show the image area.
    */

    imagePreview.hidden =
        false;


    /*
        Every newly selected image
        starts at 100%.
    */

    setImageZoom(100);


    /*
        Show file name.
    */

    if (imageFileName) {

        imageFileName.textContent =
            file.path;

    }


    /*
        Load image directly from GitHub.
    */

    previewImage.src =
        file.download_url;


    previewImage.alt =
        file.name;


    /*
        Open image link.
    */

    if (imageRawLink) {

        imageRawLink.href =
            file.download_url;

    }


    statusText.textContent =
        "Image preview";


    /*
        Image error.
    */

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

    /*
        If image elements don't exist,
        simply restore editor.
    */

    if (!imagePreview) {

        codeEditor.style.display =
            "";

        lineNumbers.style.display =
            "";

        return;
    }


    /*
        Completely hide image preview.
    */

    imagePreview.hidden =
        true;


    /*
        Remove previous image.
    */

    if (previewImage) {

        previewImage.removeAttribute(
            "src"
        );

        previewImage.style.transform =
            "scale(1)";

    }


    /*
        Reset image zoom.
    */

    imageZoom =
        100;


    if (imageZoomReset) {

        imageZoomReset.textContent =
            "100%";

    }


    /*
        Reset image link.
    */

    if (imageRawLink) {

        imageRawLink.href =
            "#";

    }


    /*
        Bring code editor back.
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
            isImageFile(selectedFile.name)
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
            isImageFile(selectedFile.name)
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

            setWebsiteZoom(100);

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

            /*
                Prevent toolbar click from
                affecting anything else.
            */

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


            setImageZoom(100);

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

            /*
                Don't do anything if image isn't open.
            */

            if (
                imagePreview.hidden
            ) {

                return;
            }


            /*
                Only zoom when mouse is
                over the image preview.
            */

            event.preventDefault();


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
    IMAGE CLICK ZOOM
    ============================================================
*/

if (previewImage) {

    previewImage.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            /*
                100% -> 200%
                200% -> 100%
            */

            if (
                imageZoom === 100
            ) {

                setImageZoom(200);

            }

            else {

                setImageZoom(100);

            }

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
            Ctrl + + = website zoom in
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


        /*
            Ctrl + - = website zoom out
        */

        if (
            event.ctrlKey &&
            event.key === "-"
        ) {

            event.preventDefault();


            setWebsiteZoom(
                websiteZoom - 10
            );

        }


        /*
            Ctrl + 0 = website zoom reset
        */

        if (
            event.ctrlKey &&
            event.key === "0"
        ) {

            event.preventDefault();


            setWebsiteZoom(100);

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

        selectedFile = null;

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
    INITIALIZE ZOOM
    ============================================================
*/

setWebsiteZoom(
    websiteZoom
);


setImageZoom(100);


/*
    ============================================================
    START
    ============================================================
*/

loadFiles();
