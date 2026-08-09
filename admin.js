/* =========================================================
   GLOBALTRACK LOGISTICS
   ADMIN SHIPMENT MANAGEMENT
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const shipmentForm =
    document.getElementById("shipmentForm");

const responseBox =
    document.getElementById("response");

const trackingResult =
    document.getElementById("trackingResult");

const createShipmentBtn =
    document.getElementById("createShipmentBtn");

const customStatusGroup =
    document.getElementById("customStatusGroup");

const statusSelect =
    document.getElementById("status");

const customStatusInput =
    document.getElementById("customStatus");

const shipmentList =
    document.getElementById("shipmentList");

const shipmentSearch =
    document.getElementById("shipmentSearch");

const shipmentCount =
    document.getElementById("shipmentCount");

const refreshShipmentsBtn =
    document.getElementById("refreshShipmentsBtn");

const editModal =
    document.getElementById("editModal");

const closeModalBtn =
    document.getElementById("closeModalBtn");

const cancelEditBtn =
    document.getElementById("cancelEditBtn");

const editShipmentForm =
    document.getElementById("editShipmentForm");

const editStatus =
    document.getElementById("editStatus");

const editCustomStatusGroup =
    document.getElementById("editCustomStatusGroup");

const editResponse =
    document.getElementById("editResponse");

const saveEditBtn =
    document.getElementById("saveEditBtn");


/*
    Stores all shipments currently loaded
    from the backend.
*/

let allShipments = [];


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(dateValue) {

    if (!dateValue) {
        return "Not available";
    }

    const date =
        new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
    }

    return date.toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}


/* =========================================================
   CUSTOM HOLD
========================================================= */

statusSelect.addEventListener(
    "change",
    function () {

        if (this.value === "Custom Hold") {

            customStatusGroup.classList.remove(
                "hidden"
            );

            customStatusInput.required = true;

        } else {

            customStatusGroup.classList.add(
                "hidden"
            );

            customStatusInput.required = false;

            customStatusInput.value = "";
        }
    }
);


/* =========================================================
   GET FINAL STATUS
========================================================= */

function getCreateStatus() {

    if (
        statusSelect.value === "Custom Hold"
    ) {

        const custom =
            customStatusInput.value.trim();

        if (!custom) {
            return null;
        }

        return custom;
    }

    return statusSelect.value.trim();
}


/* =========================================================
   CREATE SHIPMENT
========================================================= */

shipmentForm.addEventListener(
    "submit",
    async function (e) {

        e.preventDefault();


        const finalStatus =
            getCreateStatus();


        if (!finalStatus) {

            responseBox.innerHTML = `
                <div class="response-error">
                    Please enter the custom hold reason.
                </div>
            `;

            return;
        }


        const shipmentData = {

            senderName:
                document
                    .getElementById("senderName")
                    .value
                    .trim(),

            receiverName:
                document
                    .getElementById("receiverName")
                    .value
                    .trim(),

            receiverPhone:
                document
                    .getElementById("receiverPhone")
                    .value
                    .trim(),

            origin:
                document
                    .getElementById("origin")
                    .value
                    .trim(),

            destination:
                document
                    .getElementById("destination")
                    .value
                    .trim(),

            currentLocation:
                document
                    .getElementById("currentLocation")
                    .value
                    .trim(),

            status:
                finalStatus,

            shipmentType:
                document
                    .getElementById("shipmentType")
                    .value
                    .trim(),

            packageName:
                document
                    .getElementById("packageName")
                    .value
                    .trim(),

            weight:
                document
                    .getElementById("packageWeight")
                    .value
                    .trim(),

            shippingMethod:
                document
                    .getElementById("shippingMethod")
                    .value
                    .trim(),

            estimatedDelivery:
                document
                    .getElementById("estimatedDelivery")
                    .value
                    .trim()
        };


        /*
            Loading state
        */

        createShipmentBtn.disabled = true;

        createShipmentBtn.classList.add(
            "loading"
        );

        responseBox.innerHTML = `
            <div class="response-loading">
                Registering shipment securely...
            </div>
        `;

        trackingResult.classList.remove(
            "show"
        );


        try {

            const response =
                await fetch(
                    "/api/shipment/create",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                shipmentData
                            )
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Unable to create shipment."
                );
            }


            /*
                Successful creation
            */

            responseBox.innerHTML = "";


            trackingResult.innerHTML = `

                <div class="response-success">

                    <div class="success-top">

                        <div class="success-icon">
                            ✓
                        </div>

                        <div>

                            <h3>
                                Shipment Created Successfully
                            </h3>

                            <p>
                                Your shipment has been
                                registered successfully.
                            </p>

                        </div>

                    </div>


                    <div class="generated-code-box">

                        <span class="generated-code-label">
                            GENERATED TRACKING CODE
                        </span>


                        <div class="code-row">

                            <strong
                                id="generatedTrackingCode"
                                class="generated-code"
                            >
                                ${escapeHTML(
                                    data.trackingCode
                                )}
                            </strong>


                            <button
                                type="button"
                                class="copy-code-icon"
                                id="copyCodeButton"
                                title="Copy tracking code"
                                aria-label="Copy tracking code"
                            >
                                ⧉
                            </button>

                        </div>


                        <p class="code-help">

                            Give this tracking code to the
                            customer so they can track the
                            shipment from the Track Shipment
                            page.

                        </p>

                    </div>

                </div>
            `;


            trackingResult.classList.add(
                "show"
            );


            /*
                Copy button
            */

            const copyButton =
                document.getElementById(
                    "copyCodeButton"
                );


            if (copyButton) {

                copyButton.addEventListener(
                    "click",
                    function () {

                        copyTrackingCode(
                            data.trackingCode,
                            copyButton
                        );

                    }
                );

            }


            /*
                Clear form
            */

            shipmentForm.reset();

            customStatusGroup.classList.add(
                "hidden"
            );

            customStatusInput.required =
                false;


            /*
                Refresh registered shipments
            */

            loadShipments();


            /*
                Scroll customer/admin to
                generated code.
            */

            setTimeout(() => {

                trackingResult.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            }, 100);


        } catch (error) {

            console.error(
                "Create shipment error:",
                error
            );


            responseBox.innerHTML = `

                <div class="response-error">

                    ${escapeHTML(
                        error.message ||
                        "Unable to connect to the server."
                    )}

                </div>

            `;

        } finally {

            createShipmentBtn.disabled = false;

            createShipmentBtn.classList.remove(
                "loading"
            );
        }

    }
);


/* =========================================================
   COPY TRACKING CODE
========================================================= */

async function copyTrackingCode(
    code,
    button
) {

    try {

        await navigator.clipboard.writeText(
            code
        );


        button.textContent = "✓";

        button.classList.add(
            "copied"
        );

        button.title = "Copied";


        setTimeout(() => {

            button.textContent = "⧉";

            button.classList.remove(
                "copied"
            );

            button.title =
                "Copy tracking code";

        }, 2000);


    } catch (error) {

        /*
            Fallback for browsers that
            block navigator.clipboard.
        */

        const textArea =
            document.createElement("textarea");

        textArea.value = code;

        document.body.appendChild(
            textArea
        );

        textArea.select();

        try {

            document.execCommand(
                "copy"
            );

            button.textContent = "✓";

            button.classList.add(
                "copied"
            );

            setTimeout(() => {

                button.textContent = "⧉";

                button.classList.remove(
                    "copied"
                );

            }, 2000);

        } catch (copyError) {

            alert(
                "Tracking Code: " + code
            );

        }

        document.body.removeChild(
            textArea
        );
    }
}


/* =========================================================
   LOAD ALL REGISTERED SHIPMENTS
========================================================= */

async function loadShipments() {

    shipmentList.innerHTML = `

        <div class="shipments-loading">

            <span class="small-spinner"></span>

            Loading registered shipments...

        </div>

    `;


    try {

        const response =
            await fetch(
                "/api/shipment/all"
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to load shipments."
            );
        }


        /*
            Support either:

            [
                shipment,
                shipment
            ]

            or:

            {
                shipments: [...]
            }
        */

        allShipments =
            Array.isArray(data)
                ? data
                : (
                    Array.isArray(
                        data.shipments
                    )
                        ? data.shipments
                        : []
                );


        renderShipments(
            allShipments
        );


    } catch (error) {

        console.error(
            "Load shipments error:",
            error
        );


        shipmentList.innerHTML = `

            <div class="empty-shipments">

                Unable to load registered shipments.

                <br><br>

                Make sure your server is running
                and the
                <strong>
                    /api/shipment/all
                </strong>
                endpoint is available.

            </div>

        `;

        shipmentCount.textContent =
            "0 shipments";
    }
}


/* =========================================================
   RENDER SHIPMENTS
========================================================= */

function renderShipments(
    shipments
) {

    if (!shipments.length) {

        shipmentList.innerHTML = `

            <div class="empty-shipments">

                No registered shipments found.

            </div>

        `;

        shipmentCount.textContent =
            "0 shipments";

        return;
    }


    shipmentCount.textContent =
        `${shipments.length} ${
            shipments.length === 1
                ? "shipment"
                : "shipments"
        }`;


    shipmentList.innerHTML =
        shipments
            .map(
                (shipment, index) => {

                    const code =
                        shipment.trackingCode ||
                        shipment.code ||
                        "Unknown";


                    const sender =
                        shipment.senderName ||
                        shipment.sender?.name ||
                        "Unknown";


                    const receiver =
                        shipment.receiverName ||
                        shipment.receiver?.name ||
                        "Unknown";


                    const status =
                        shipment.status ||
                        "Unknown";


                    const updated =
                        shipment.lastUpdated ||
                        shipment.updatedAt ||
                        shipment.createdAt ||
                        "";


                    return `

                        <article
                            class="shipment-card"
                            data-index="${index}"
                        >

                            <div>

                                <span class="shipment-card-label">
                                    Tracking Code
                                </span>

                                <div class="shipment-card-code">
                                    ${escapeHTML(code)}
                                </div>

                            </div>


                            <div>

                                <span class="shipment-card-label">
                                    Sender
                                </span>

                                <div class="shipment-card-value">
                                    ${escapeHTML(sender)}
                                </div>

                            </div>


                            <div>

                                <span class="shipment-card-label">
                                    Receiver
                                </span>

                                <div class="shipment-card-value">
                                    ${escapeHTML(receiver)}
                                </div>

                            </div>


                            <div>

                                <span class="shipment-card-label">
                                    Status
                                </span>

                                <span class="shipment-status">
                                    ${escapeHTML(status)}
                                </span>

                            </div>


                            <div class="shipment-card-action">

                                <button
                                    type="button"
                                    class="edit-shipment-btn"
                                    data-index="${index}"
                                >
                                    Edit
                                </button>

                            </div>

                        </article>

                    `;

                }
            )
            .join("");


    /*
        Make entire shipment card clickable.
    */

    document
        .querySelectorAll(
            ".shipment-card"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                function (event) {

                    /*
                        Prevent double event when
                        clicking Edit button.
                    */

                    if (
                        event.target.closest(
                            ".edit-shipment-btn"
                        )
                    ) {
                        return;
                    }


                    const index =
                        Number(
                            this.dataset.index
                        );


                    openEditModal(
                        allShipments[index]
                    );

                }
            );

        });


    /*
        Edit buttons
    */

    document
        .querySelectorAll(
            ".edit-shipment-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    const index =
                        Number(
                            this.dataset.index
                        );


                    openEditModal(
                        allShipments[index]
                    );

                }
            );

        });
}


/* =========================================================
   SEARCH SHIPMENTS
========================================================= */

shipmentSearch.addEventListener(
    "input",
    function () {

        const query =
            this.value
                .trim()
                .toLowerCase();


        if (!query) {

            renderShipments(
                allShipments
            );

            return;
        }


        const filtered =
            allShipments.filter(
                shipment => {

                    const code =
                        shipment.trackingCode ||
                        "";

                    const sender =
                        shipment.senderName ||
                        shipment.sender?.name ||
                        "";

                    const receiver =
                        shipment.receiverName ||
                        shipment.receiver?.name ||
                        "";

                    const status =
                        shipment.status ||
                        "";


                    return (

                        code
                            .toLowerCase()
                            .includes(query)

                        ||

                        sender
                            .toLowerCase()
                            .includes(query)

                        ||

                        receiver
                            .toLowerCase()
                            .includes(query)

                        ||

                        status
                            .toLowerCase()
                            .includes(query)

                    );

                }
            );


        renderShipments(
            filtered
        );
    }
);


/* =========================================================
   OPEN EDIT MODAL
========================================================= */

function openEditModal(
    shipment
) {

    if (!shipment) {
        return;
    }


    const code =
        shipment.trackingCode ||
        shipment.code ||
        "";


    document.getElementById(
        "editCode"
    ).value = code;


    document.getElementById(
        "editTrackingCode"
    ).textContent =
        "Tracking Code: " + code;


    document.getElementById(
        "editSenderName"
    ).value =
        shipment.senderName ||
        shipment.sender?.name ||
        "";


    document.getElementById(
        "editReceiverName"
    ).value =
        shipment.receiverName ||
        shipment.receiver?.name ||
        "";


    document.getElementById(
        "editReceiverPhone"
    ).value =
        shipment.receiverPhone ||
        "";


    document.getElementById(
        "editOrigin"
    ).value =
        shipment.origin ||
        shipment.sender?.address ||
        "";


    document.getElementById(
        "editDestination"
    ).value =
        shipment.destination ||
        shipment.receiver?.address ||
        "";


    document.getElementById(
        "editCurrentLocation"
    ).value =
        shipment.currentLocation?.label ||
        shipment.currentLocation ||
        "";


    document.getElementById(
        "editShipmentType"
    ).value =
        shipment.shipmentType ||
        "";


    document.getElementById(
        "editPackageName"
    ).value =
        shipment.packageName ||
        "";


    document.getElementById(
        "editWeight"
    ).value =
        shipment.weight ||
        "";


    document.getElementById(
        "editShippingMethod"
    ).value =
        shipment.shippingMethod ||
        "";


    const knownStatuses = [
        "Shipment Created",
        "Picked Up",
        "In Transit",
        "Arrived at Facility",
        "Out for Delivery",
        "Delivered",
        "Custom Hold"
    ];


    const shipmentStatus =
        shipment.status || "";


    if (
        knownStatuses.includes(
            shipmentStatus
        )
    ) {

        editStatus.value =
            shipmentStatus;

        document.getElementById(
            "editCustomStatus"
        ).value = "";

    } else {

        editStatus.value =
            "Custom Hold";

        document.getElementById(
            "editCustomStatus"
        ).value =
            shipmentStatus;

    }


    updateEditCustomStatus();


    /*
        Estimated delivery.
    */

    const delivery =
        shipment.estimatedDelivery ||
        "";


    if (delivery) {

        const date =
            new Date(delivery);


        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            document.getElementById(
                "editEstimatedDelivery"
            ).value =
                date
                    .toISOString()
                    .split("T")[0];

        } else {

            document.getElementById(
                "editEstimatedDelivery"
            ).value =
                delivery;

        }

    } else {

        document.getElementById(
            "editEstimatedDelivery"
        ).value = "";

    }


    editResponse.innerHTML = "";


    editModal.classList.remove(
        "hidden"
    );


    document.body.style.overflow =
        "hidden";
}


/* =========================================================
   EDIT CUSTOM HOLD
========================================================= */

editStatus.addEventListener(
    "change",
    updateEditCustomStatus
);


function updateEditCustomStatus() {

    if (
        editStatus.value === "Custom Hold"
    ) {

        editCustomStatusGroup.classList.remove(
            "hidden"
        );

    } else {

        editCustomStatusGroup.classList.add(
            "hidden"
        );

        document.getElementById(
            "editCustomStatus"
        ).value = "";

    }
}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeEditModal() {

    editModal.classList.add(
        "hidden"
    );

    document.body.style.overflow =
        "";

    editResponse.innerHTML = "";
}


closeModalBtn.addEventListener(
    "click",
    closeEditModal
);


cancelEditBtn.addEventListener(
    "click",
    closeEditModal
);


/*
    Close when clicking outside modal.
*/

editModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target === editModal
        ) {

            closeEditModal();

        }

    }
);


/*
    Close with Escape.
*/

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            !editModal.classList.contains(
                "hidden"
            )
        ) {

            closeEditModal();

        }

    }
);


/* =========================================================
   UPDATE SHIPMENT
========================================================= */

editShipmentForm.addEventListener(
    "submit",
    async function (e) {

        e.preventDefault();


        const trackingCode =
            document.getElementById(
                "editCode"
            ).value.trim();


        let finalStatus =
            editStatus.value.trim();


        if (
            finalStatus === "Custom Hold"
        ) {

            const custom =
                document.getElementById(
                    "editCustomStatus"
                ).value.trim();


            if (!custom) {

                editResponse.innerHTML = `

                    <div class="response-error">

                        Please enter the custom hold reason.

                    </div>

                `;

                return;
            }


            finalStatus = custom;
        }


        const updateData = {

            senderName:
                document
                    .getElementById(
                        "editSenderName"
                    )
                    .value
                    .trim(),

            receiverName:
                document
                    .getElementById(
                        "editReceiverName"
                    )
                    .value
                    .trim(),

            receiverPhone:
                document
                    .getElementById(
                        "editReceiverPhone"
                    )
                    .value
                    .trim(),

            origin:
                document
                    .getElementById(
                        "editOrigin"
                    )
                    .value
                    .trim(),

            destination:
                document
                    .getElementById(
                        "editDestination"
                    )
                    .value
                    .trim(),

            currentLocation:
                document
                    .getElementById(
                        "editCurrentLocation"
                    )
                    .value
                    .trim(),

            shipmentType:
                document
                    .getElementById(
                        "editShipmentType"
                    )
                    .value
                    .trim(),

            packageName:
                document
                    .getElementById(
                        "editPackageName"
                    )
                    .value
                    .trim(),

            weight:
                document
                    .getElementById(
                        "editWeight"
                    )
                    .value
                    .trim(),

            shippingMethod:
                document
                    .getElementById(
                        "editShippingMethod"
                    )
                    .value
                    .trim(),

            status:
                finalStatus,

            estimatedDelivery:
                document
                    .getElementById(
                        "editEstimatedDelivery"
                    )
                    .value
                    .trim()
        };


        saveEditBtn.disabled = true;

        saveEditBtn.textContent =
            "Saving Changes...";


        editResponse.innerHTML = `

            <div class="response-loading">

                Updating shipment and recording
                tracking history...

            </div>

        `;


        try {

            const response =
                await fetch(
                    `/api/shipment/update/${encodeURIComponent(
                        trackingCode
                    )}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                updateData
                            )
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Unable to update shipment."
                );
            }


            editResponse.innerHTML = `

                <div class="response-success">

                    <strong>
                        Shipment Updated Successfully
                    </strong>

                    <br>

                    The new status and update have
                    been added to the shipment history.

                </div>

            `;


            /*
                Reload database.
            */

            await loadShipments();


            /*
                Close after a short delay.
            */

            setTimeout(() => {

                closeEditModal();

            }, 900);


        } catch (error) {

            console.error(
                "Update shipment error:",
                error
            );


            editResponse.innerHTML = `

                <div class="response-error">

                    ${escapeHTML(
                        error.message ||
                        "Unable to update shipment."
                    )}

                </div>

            `;

        } finally {

            saveEditBtn.disabled = false;

            saveEditBtn.textContent =
                "Save Changes";
        }

    }
);


/* =========================================================
   REFRESH BUTTON
========================================================= */

refreshShipmentsBtn.addEventListener(
    "click",
    loadShipments
);


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadShipments();

    }
);