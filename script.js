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

const fileList =
    document.getElementById("fileList");

const codeEditor =
    document.getElementById("codeEditor");

const lineNumbers =
    document.getElementById("lineNumbers");

const currentFile =
    document.getElementById("currentFile");

const copyButton =
    document.getElementById("copyButton");

const resetButton =
    document.getElementById("resetButton");

const refreshButton =
    document.getElementById("refreshButton");

const statusText =
    document.getElementById("statusText");

const cursorPosition =
    document.getElementById("cursorPosition");

const imagePreview =
    document.getElementById("imagePreview");

const previewImage =
    document.getElementById("previewImage");

const imageFileName =
    document.getElementById("imageFileName");

const imageRawLink =
    document.getElementById("imageRawLink");


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
    IMAGE FILE TYPES
    ============================================================
*/

const IMAGE_EXTENSIONS = new Set([
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "svg",
    "bmp",
    "ico",
    "avif"
]);


/*
    Check whether a file is an image.
*/

function isImageFile(fileName) {

    const extension =
        fileName
            .split(".")
            .pop()
            .toLowerCase();

    return IMAGE_EXTENSIONS.has(extension);
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

        files = files.filter(file => {

            const fileName =
                file.path
                    .split("/")
                    .pop()
                    .toLowerCase();

            return !HIDDEN_FILES.some(
                hidden =>
                    hidden.toLowerCase() === fileName
            );

        });


        /*
            Sort paths.
        */

        files.sort((a, b) => {

            return a.path.localeCompare(
                b.path,
                undefined,
                {
                    numeric: true,
                    sensitivity: "base"
                }
            );

        });


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


    /*
        Virtual root.
    */

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


        /*
            Process folders.
        */

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


        /*
            Add file.
        */

        current.files.push(file);

    }


    /*
        Render tree.
    */

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
        Get folders.
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
        Get files.
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


        /*
            Folder wrapper.
        */

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


        /*
            Build folder button.
        */

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
            Folder click.
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


        /*
            Add folder.
        */

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
            IMPORTANT:
            Store path so active file highlighting works.
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


        /*
            Build button.
        */

        button.appendChild(
            icon
        );

        button.appendChild(
            name
        );


        /*
            Tooltip.
        */

        button.title =
            file.path;


        /*
            Open file.
        */

        button.addEventListener(
            "click",
            () => openFile(file)
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


        /*
            Hide image preview first.
        */

        hideImagePreview();


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

        if (isImageFile(file.name)) {

            showImagePreview(file);


            /*
                Images are not loaded into textarea.
            */

            codeEditor.value =
                "";

            codeEditor.disabled =
                true;


            originalCode =
                "";


            copyButton.disabled =
                true;

            resetButton.disabled =
                true;


            updateLineNumbers();

            updateCursorPosition();


            statusText.textContent =
                "Image preview";


            return;
        }


        /*
            ====================================================
            TEXT / CODE FILE
            ====================================================
        */

        const response =
            await fetch(
                file.download_url
            );


        if (!response.ok) {

            throw new Error(
                "Could not download file."
            );

        }


        /*
            Read as plain text.
        */

        const code =
            await response.text();


        originalCode =
            code;


        /*
            Load local edits if available.
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


        codeEditor.disabled =
            false;


        copyButton.disabled =
            false;


        resetButton.disabled =
            false;


        updateLineNumbers();

        updateCursorPosition();


        /*
            Save current version locally.
        */

        localStorage.setItem(
            `code-editor-${file.path}`,
            codeEditor.value
        );


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
    IMAGE PREVIEW
    ============================================================
*/

function showImagePreview(file) {

    /*
        Make preview visible.
    */

    imagePreview.hidden =
        false;


    /*
        Show file name.
    */

    imageFileName.textContent =
        file.path;


    /*
        Use GitHub's direct image URL.
        
        This means:
        
        images/image.png
        
        will be loaded directly as an image.
    */

    previewImage.src =
        file.download_url;


    previewImage.alt =
        file.name;


    /*
        Direct image link.
    */

    imageRawLink.href =
        file.download_url;


    imageRawLink.textContent =
        "Open image";


    /*
        Hide code editor.
    */

    codeEditor.style.display =
        "none";


    lineNumbers.style.display =
        "none";


    /*
        Image loading error.
    */

    previewImage.onerror =
        () => {

            statusText.textContent =
                "Could not display image";

        };
}


/*
    ============================================================
    HIDE IMAGE PREVIEW
    ============================================================
*/

function hideImagePreview() {

    if (!imagePreview) {
        return;
    }


    imagePreview.hidden =
        true;


    previewImage.removeAttribute(
        "src"
    );


    imageRawLink.href =
        "#";


    /*
        Show code editor again.
    */

    codeEditor.style.display =
        "";


    lineNumbers.style.display =
        "";
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

        /*
            Don't copy image files.
        */

        if (
            codeEditor.disabled ||
            !selectedFile
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

        /*
            Images cannot be reset.
        */

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

        if (!selectedFile) {

            return;

        }


        /*
            Don't save image files.
        */

        if (
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


    let numbers =
        "";


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


/*
    Update cursor when typing.
*/

codeEditor.addEventListener(
    "keyup",
    updateCursorPosition
);


/*
    Update cursor when clicking.
*/

codeEditor.addEventListener(
    "click",
    updateCursorPosition
);


/*
    Update cursor when selecting.
*/

codeEditor.addEventListener(
    "select",
    updateCursorPosition
);


/*
    ============================================================
    REFRESH
    ============================================================
*/

refreshButton.addEventListener(
    "click",
    () => {

        loadFiles();

    }
);


/*
    ============================================================
    START APPLICATION
    ============================================================
*/

loadFiles();
