/*
    ============================================================
    CONFIGURATION
    ============================================================

    Your GitHub repository:

    https://github.com/alatheesh/mycode
*/

const OWNER = "alatheesh";
const REPO = "mycode";


// GitHub branch
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
            ====================================================
            FILES TO HIDE
            ====================================================

            These files still exist in GitHub.

            They are ONLY hidden from this website's sidebar.

            The comparison is case-insensitive.
        */

        const HIDDEN_FILES = [

            // Website files
            "index.html",
            "style.css",
            "script.js",

            // GitHub files
            "README.md",
            "README",

            "LICENSE",
            "LICENSE.md",
            "LICENSE.txt"

        ];


        files = files.filter(file => {

            const fileName =
                file.path
                    .split("/")
                    .pop()
                    .toLowerCase();


            return !HIDDEN_FILES.some(hidden => {

                return hidden.toLowerCase() === fileName;

            });

        });



        /*
            ====================================================
            SORT FILES
            ====================================================
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
            ====================================================
            DISPLAY FILES
            ====================================================
        */

        displayFileList();



        /*
            ====================================================
            NO FILES
            ====================================================
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



        /*
            ====================================================
            STATUS
            ====================================================
        */

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


        button.className =
            "file-item";


        /*
            Using textContent is important.

            It means the filename is displayed as text
            and cannot accidentally become HTML.
        */

        button.textContent =
            file.path;


        button.title =
            file.path;


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
            ====================================================
            IMPORTANT
            ====================================================

            Read the GitHub file as TEXT.

            Nothing is executed.

            HTML stays text.
            JavaScript stays text.
            Python stays text.
            C++ stays text.

            Spaces and indentation are preserved.
        */

        const code =
            await response.text();



        /*
            ====================================================
            SET CURRENT FILE
            ====================================================
        */

        selectedFile =
            file;


        originalCode =
            code;


        codeEditor.value =
            code;


        codeEditor.disabled =
            false;


        currentFile.textContent =
            file.path;


        copyButton.disabled =
            false;


        resetButton.disabled =
            false;



        /*
            ====================================================
            UPDATE UI
            ====================================================
        */

        updateLineNumbers();

        updateCursorPosition();

        highlightSelectedFile();



        /*
            ====================================================
            SAVE EDITED VERSION LOCALLY
            ====================================================

            This saves the user's edited version in their
            browser.

            It does NOT change the GitHub file.
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

        button.classList.remove(
            "active"
        );


        if (
            selectedFile &&
            button.textContent === selectedFile.path
        ) {

            button.classList.add(
                "active"
            );

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
                Fallback for browsers where
                Clipboard API is unavailable.
            */

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
*/

codeEditor.addEventListener(
    "input",
    () => {

        if (!selectedFile) {

            return;

        }


        /*
            Save edited text locally.
        */

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

    Pressing TAB inside the editor inserts 4 spaces.
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
        codeEditor.value.split("\n").length;


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
        lines[
            lines.length - 1
        ].length + 1;


    cursorPosition.textContent =
        `Ln ${line}, Col ${column}`;

}



/*
    Update cursor position when typing.
*/

codeEditor.addEventListener(
    "keyup",
    updateCursorPosition
);


/*
    Update cursor position when clicking.
*/

codeEditor.addEventListener(
    "click",
    updateCursorPosition
);


/*
    Update cursor position when selecting.
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
    START
    ============================================================
*/

loadFiles();
