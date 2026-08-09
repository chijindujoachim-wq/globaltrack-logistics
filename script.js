function trackShipment() {

    const trackingInput =
        document.getElementById("trackingCode");

    const trackingCode =
        trackingInput.value.trim();

    let errorMessage =
        document.getElementById("trackingError");

    if (!errorMessage) {

        errorMessage =
            document.createElement("p");

        errorMessage.id =
            "trackingError";

        errorMessage.style.color =
            "#ff5252";

        errorMessage.style.marginTop =
            "10px";

        trackingInput
            .parentElement
            .appendChild(errorMessage);
    }

    errorMessage.textContent = "";

    if (!trackingCode) {

        errorMessage.textContent =
            "Please enter your tracking code.";

        trackingInput.focus();

        return;
    }

    window.location.href =
        "track.html?code=" +
        encodeURIComponent(trackingCode);
}


// Allow pressing ENTER
document.addEventListener("DOMContentLoaded", () => {

    const trackingInput =
        document.getElementById("trackingCode");

    if (trackingInput) {

        trackingInput.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    event.preventDefault();

                    trackShipment();
                }
            }
        );
    }
});