/*
    ============================================================
    CONFIGURATION
    ============================================================

    If your GitHub Pages URL is:

    https://username.github.io/my-repository/

    then:

    OWNER = username
    REPO  = my-repository

    Change these two values.
*/


const OWNER = "YOUR_GITHUB_USERNAME";
const REPO = "YOUR_REPOSITORY_NAME";


// Change this if your files are on another branch.
const BRANCH = "main";


// Folder to read.

//
// "" means the root of the repository.
//
// Example:
// const ROOT_FOLDER = "src";
//
// would read files inside:
// repository/src/
//

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
    ============================================================
    STATE
    ============================================================
*/

let files = [];

let selectedFile = null;

let originalCode = "";



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

    const response = await fetch(url);

    if (!response.ok) {

        throw new Error(
            `GitHub returned ${response.status}`
        );

    }

    return await response.json();
}



/*
    ============================================================
    LOAD ALL FILES
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

        await scanDirectory(ROOT_FOLDER);

        /*
            Remove files that belong to the website itself.

            This prevents index.html, style.css and script.js
            from being displayed unless you want them.
        */

        files = files.filter(file => {

            return ![
                "index.html",
                "style.css",
                "script.js"
            ].includes(
                file.path.split("/").pop()
            );

        });


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


        displayFileList();


        if (files.length === 0) {

            fileList.innerHTML = `
                <div class="loading">
                    No files found.
                </div>
            `;

            return;
        }


        statusText.textContent =
            `${files.length} file(s) found`;


    } catch (error) {

        console.error(error);

        fileList.innerHTML = `
            <div class="error">
                Could not load GitHub files.
                <br><br>
                Check your username, repository name,
                branch, and repository visibility.
            </div>
        `;

        statusText.textContent = "Error loading files";
    }
}



/*
    ============================================================
    RECURSIVELY SCAN DIRECTORIES
    ============================================================
*/

async function scanDirectory(path) {

    const items = await getRepositoryFiles(path);


    for (const item of items) {

        if (item.type === "file") {

            files.push({
                name: item.name,
                path: item.path,
                download_url: item.download_url
            });

        }


        else if (item.type === "dir") {

            await scanDirectory(item.path);

        }

    }
}



/*
    ============================================================
    DISPLAY FILE LIST
    ============================================================
*/

function displayFileList() {

    fileList.innerHTML = "";


    for (const file of files) {

        const button =
            document.createElement("button");


        button.className = "file-item";

        button.textContent = file.path;


        button.title = file.path;


        button.addEventListener(
            "click",
            () => openFile(file)
        );


        fileList.appendChild(button);

    }
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


        const response =
            await fetch(file.download_url);


        if (!response.ok) {

            throw new Error(
                "Could not download file."
            );

        }


        /*
            IMPORTANT:

            response.text() reads the file as TEXT.

            It does NOT execute HTML.
            It does NOT interpret JavaScript.
            It does NOT modify indentation.
        */

        const code =
            await response.text();


        selectedFile = file;

        originalCode = code;


        codeEditor.value = code;

        codeEditor.disabled = false;


        currentFile.textContent =
            file.path;


        copyButton.disabled = false;

        resetButton.disabled = false;


        updateLineNumbers();

        updateCursorPosition();

        highlightSelectedFile();


        /*
            Save this version locally.

            This means if the user refreshes the page,
            their browser can remember their edit.
        */

        localStorage.setItem(
            `code-editor-${file.path}`,
            code
        );


        statusText.textContent =
            "Loaded";


    } catch (error) {

        console.error(error);

        statusText.textContent =
            "Could not load file";

    }

}



/*
    ============================================================
    SELECT ACTIVE FILE
    ============================================================
*/

function highlightSelectedFile() {

    const buttons =
        fileList.querySelectorAll(
            ".file-item"
        );


    buttons.forEach(button => {

        button.classList.remove("active");


        if (
            selectedFile &&
            button.textContent === selectedFile.path
        ) {

            button.classList.add("active");

        }

    });

}



/*
    ============================================================
    COPY CODE
    ============================================================
*/

copyButton.addEventListener(
    "click",
    async () => {

        if (codeEditor.disabled) {
            return;
        }


        try {

            await navigator.clipboard.writeText(
                codeEditor.value
            );


            statusText.textContent =
                "Copied!";


            setTimeout(() => {

                statusText.textContent =
                    "Ready";

            }, 1500);


        } catch (error) {

            /*
                Fallback for browsers where the
                Clipboard API is unavailable.
            */

            codeEditor.select();

            document.execCommand("copy");

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

        if (!selectedFile) {
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

    The editor is completely normal text.

    Spaces, tabs, blank lines, brackets, quotes,
    indentation, etc. are preserved exactly.
*/

codeEditor.addEventListener(
    "input",
    () => {

        if (!selectedFile) {
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
    TAB KEY SUPPORT
    ============================================================

    Normally pressing TAB inside a textarea
    moves to the next HTML element.

    We change that so TAB inserts spaces.
*/

codeEditor.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Tab") {
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
            value.substring(0, start) +
            "    " +
            value.substring(end);


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
        codeEditor.value.split("\n").length;


    let numbers = "";


    for (
        let i = 1;
        i <= lineCount;
        i++
    ) {

        numbers += i + "\n";

    }


    lineNumbers.textContent =
        numbers;

}



/*
    ============================================================
    SYNCHRONIZE LINE NUMBER SCROLLING
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
        beforeCursor.split("\n");


    const line =
        lines.length;


    const column =
        lines[lines.length - 1].length + 1;


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
    START
    ============================================================
*/

loadFiles();
