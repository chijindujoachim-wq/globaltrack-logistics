/* =========================================================
   GLOBALTRACK LOGISTICS
   SECURE ADMIN LOGIN
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE_URL =
    "https://globaltrack-logistics.onrender.com";


/* =========================================================
   REDIRECT ALREADY AUTHENTICATED ADMIN
========================================================= */

(async function checkExistingAdminSession() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/admin/me`,
                {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        if (
            data &&
            data.authenticated === true
        ) {

            window.location.replace(
                "admin.html"
            );

        }

    } catch (error) {

        console.log(
            "No active administrator session."
        );

    }

})();

/* =========================================================
   DOM ELEMENTS
========================================================= */

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const togglePassword =
    document.getElementById("togglePassword");

const loginBtn =
    document.getElementById("loginBtn");

const btnText =
    loginBtn
        ? loginBtn.querySelector(".btn-text")
        : null;

const loader =
    loginBtn
        ? loginBtn.querySelector(".btn-loader")
        : null;


/* =========================================================
   PASSWORD VISIBILITY
========================================================= */

if (
    togglePassword &&
    passwordInput
) {

    togglePassword.addEventListener(
        "click",
        () => {

            if (
                passwordInput.type ===
                "password"
            ) {

                passwordInput.type =
                    "text";

                togglePassword.textContent =
                    "🙈";

                togglePassword.setAttribute(
                    "aria-label",
                    "Hide password"
                );

                togglePassword.setAttribute(
                    "aria-pressed",
                    "true"
                );

            } else {

                passwordInput.type =
                    "password";

                togglePassword.textContent =
                    "👁";

                togglePassword.setAttribute(
                    "aria-label",
                    "Show password"
                );

                togglePassword.setAttribute(
                    "aria-pressed",
                    "false"
                );

            }

        }
    );
}


/* =========================================================
   SHOW MESSAGE
========================================================= */

function showMessage(
    message,
    type
) {

    const msgBox =
        document.getElementById(
            "message"
        );

    if (!msgBox) {
        return;
    }


    /*
        Remove previous classes.
    */

    msgBox.className =
        "message-box";


    /*
        Add the new message type.
    */

    msgBox.classList.add(
        type
    );


    msgBox.textContent =
        message;


    msgBox.style.display =
        "block";


    /*
        Remove previous fade state.
    */

    msgBox.classList.remove(
        "fade-out"
    );


    /*
        Fade the message after
        a short period.
    */

    setTimeout(
        () => {

            msgBox.classList.add(
                "fade-out"
            );

        },
        2500
    );
}


/* =========================================================
   LOGIN BUTTON LOADING STATE
========================================================= */

function setLoginLoading(
    loading
) {

    if (!loginBtn) {
        return;
    }


    if (loading) {

        loginBtn.disabled =
            true;

        loginBtn.classList.add(
            "loading"
        );


        if (btnText) {

            btnText.textContent =
                "Authenticating...";

        }


        if (loader) {

            loader.style.display =
                "block";

        }

    } else {

        loginBtn.disabled =
            false;

        loginBtn.classList.remove(
            "loading"
        );


        if (btnText) {

            btnText.textContent =
                "Login";

        }


        if (loader) {

            loader.style.display =
                "none";

        }

    }
}


/* =========================================================
   ADMIN LOGIN
========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* ---------------------------------------------
               GET FORM VALUES
            --------------------------------------------- */

            const email =
                emailInput
                    ? emailInput.value
                        .trim()
                        .toLowerCase()
                    : "";


            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            const rememberMe =
                document.getElementById(
                    "rememberMe"
                );


            /* ---------------------------------------------
               BASIC VALIDATION
            --------------------------------------------- */

            if (!email) {

                showMessage(
                    "Please enter your admin email.",
                    "message-error"
                );


                if (emailInput) {

                    emailInput.focus();

                }


                return;
            }


            if (!password) {

                showMessage(
                    "Please enter your admin password.",
                    "message-error"
                );


                if (passwordInput) {

                    passwordInput.focus();

                }


                return;
            }


            /* ---------------------------------------------
               START LOADING
            --------------------------------------------- */

            setLoginLoading(
                true
            );


            try {

                /* -----------------------------------------
                   SEND LOGIN REQUEST
                ----------------------------------------- */

                const response =
                    await fetch(
                        `${API_BASE_URL}/api/admin/login`,
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Accept":
                                    "application/json"

                            },


                            /*
                                IMPORTANT:

                                This allows the browser to
                                receive and store the secure
                                authentication cookie created
                                by server.js.
                            */

                            credentials:
                                "include",


                            body:
                                JSON.stringify({

                                    email:
                                        email,

                                    password:
                                        password,

                                    rememberMe:
                                        rememberMe
                                            ? rememberMe.checked
                                            : false

                                })

                        }
                    );


                /* -----------------------------------------
                   READ SERVER RESPONSE
                ----------------------------------------- */

                let data = null;


                try {

                    data =
                        await response.json();

                } catch (error) {

                    data = null;

                }


                /* -----------------------------------------
                   LOGIN FAILED
                ----------------------------------------- */

                if (!response.ok) {

                    const errorMessage =
                        data &&
                        data.message
                            ? data.message
                            : "Incorrect admin email or password.";


                    showMessage(
                        `❌ ${errorMessage}`,
                        "message-error"
                    );


                    setLoginLoading(
                        false
                    );


                    return;
                }


                /* -----------------------------------------
                   LOGIN SUCCESSFUL
                ----------------------------------------- */

                /*
                    With secure HTTP-only cookie
                    authentication, we DO NOT expect
                    server.js to send an authentication
                    token back to JavaScript.

                    The browser stores the cookie
                    automatically.

                    Therefore, do NOT use:

                    localStorage.setItem(
                        "adminAuthToken",
                        ...
                    );

                    or:

                    sessionStorage.setItem(
                        "adminAuthToken",
                        ...
                    );

                    The authentication cookie is
                    inaccessible to JavaScript.
                */


                /* -----------------------------------------
                   OPTIONAL ADMIN INFORMATION
                ----------------------------------------- */

                if (
                    data &&
                    data.admin
                ) {

                    const adminData = {

                        email:
                            data.admin.email ||
                            email,

                        name:
                            data.admin.name ||
                            data.admin.fullname ||
                            "Administrator"

                    };


                    /*
                        Admin information is NOT used
                        as the authentication mechanism.

                        It is only stored for UI purposes.
                    */

                    if (
                        rememberMe &&
                        rememberMe.checked
                    ) {

                        localStorage.setItem(
                            "adminUser",
                            JSON.stringify(
                                adminData
                            )
                        );

                    } else {

                        sessionStorage.setItem(
                            "adminUser",
                            JSON.stringify(
                                adminData
                            )
                        );

                    }

                }


                /* -----------------------------------------
                   SUCCESS MESSAGE
                ----------------------------------------- */

                showMessage(
                    "✅ Admin authentication successful. Opening dashboard...",
                    "message-success"
                );


                /* -----------------------------------------
                   REDIRECT
                ----------------------------------------- */

                setTimeout(
                    () => {

                        window.location.href =
                            "admin.html";

                    },
                    1200
                );


            } catch (error) {

                console.error(
                    "Admin login error:",
                    error
                );


                /* -----------------------------------------
                   CONNECTION ERROR
                ----------------------------------------- */

                showMessage(
                    "❌ Unable to connect to the admin server. Please try again.",
                    "message-error"
                );


                setLoginLoading(
                    false
                );

            }

        }
    );

}


/* =========================================================
   FORGOT PASSWORD
========================================================= */

const forgotPasswordLink =
    document.getElementById(
        "forgotPasswordLink"
    );


if (forgotPasswordLink) {

    forgotPasswordLink.addEventListener(
        "click",
        function () {

            /*
                Allow the browser to open
                forgot-password.html normally.
            */

            console.log(
                "Opening admin password recovery..."
            );

        }
    );

}


/* =========================================================
   PREVENT DOUBLE SUBMISSION
========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" &&
                loginBtn &&
                loginBtn.disabled
            ) {

                event.preventDefault();

            }

        }
    );

}