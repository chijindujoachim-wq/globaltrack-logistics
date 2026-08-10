/* =========================================================
   GLOBALTRACK LOGISTICS
   FAST REAL-TIME SHIPMENT TRACKING
========================================================= */


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let map = null;
let routeLayer = null;

let senderMarker = null;
let receiverMarker = null;
let currentMarker = null;

let refreshTimer = null;

let currentShipmentData = null;

let mapInitializing = false;


/* =========================================================
   CONFIGURATION
========================================================= */

/*
    FRONTEND:
    https://dainty-kangaroo-8ed656.netlify.app

    BACKEND:
    https://globaltrack-logistics.onrender.com
*/

const API_BASE_URL =
    "https://globaltrack-logistics.onrender.com";


/*
    Automatic shipment refresh interval.
*/
const REFRESH_INTERVAL = 3000;


/*
    Map/network requests should NEVER prevent
    shipment details from appearing.
*/
const MAP_REQUEST_TIMEOUT = 2500;


/* =========================================================
   HTML SECURITY
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
   GET TRACKING CODE
========================================================= */

function getTrackingCode() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const code =
        params.get("code");


    if (!code) {

        return null;

    }


    return code
        .trim()
        .toUpperCase();
}


/* =========================================================
   SHOW LOADING
========================================================= */

function showLoading() {

    const loading =
        document.getElementById(
            "loading"
        );


    if (loading) {

        loading.classList.remove(
            "hidden"
        );

    }


    const content =
        document.getElementById(
            "shipmentContent"
        );


    if (content) {

        content.classList.add(
            "hidden"
        );

    }


    const errorBox =
        document.getElementById(
            "errorBox"
        );


    if (errorBox) {

        errorBox.classList.add(
            "hidden"
        );

    }

}


/* =========================================================
   HIDE LOADING / SHOW CONTENT
========================================================= */

function showShipmentContent() {

    const loading =
        document.getElementById(
            "loading"
        );


    if (loading) {

        loading.classList.add(
            "hidden"
        );

    }


    const content =
        document.getElementById(
            "shipmentContent"
        );


    if (content) {

        content.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   SHOW ERROR
========================================================= */

function showError(message) {

    const loading =
        document.getElementById(
            "loading"
        );


    if (loading) {

        loading.classList.add(
            "hidden"
        );

    }


    const content =
        document.getElementById(
            "shipmentContent"
        );


    if (content) {

        content.classList.add(
            "hidden"
        );

    }


    const errorBox =
        document.getElementById(
            "errorBox"
        );


    const errorMessage =
        document.getElementById(
            "errorMessage"
        );


    if (errorBox) {

        errorBox.classList.remove(
            "hidden"
        );

    }


    if (errorMessage) {

        errorMessage.textContent =
            message;

    }


    const result =
        document.getElementById(
            "shipmentResult"
        );


    if (result) {

        result.innerHTML = `

            <div class="error-message">

                ${escapeHTML(message)}

            </div>

        `;

    }

}


/* =========================================================
   LOAD SHIPMENT
========================================================= */

async function loadShipment() {

    const trackingCode =
        getTrackingCode();


    /*
        No tracking code in URL.
    */

    if (!trackingCode) {

        showError(

            "No tracking code was provided. Please return to the tracking page and enter your tracking code."

        );

        return;

    }


    showLoading();


    try {

        /*
            -------------------------------------------------
            GET SHIPMENT FROM RENDER BACKEND
            -------------------------------------------------
        */

        const response =

            await fetch(

                `${API_BASE_URL}/api/shipment/track/${encodeURIComponent(
                    trackingCode
                )}`,

                {

                    method: "GET",

                    cache: "no-store",

                    headers: {

                        "Accept":
                            "application/json"

                    }

                }

            );


        let data = null;


        try {

            data =
                await response.json();

        } catch (error) {

            throw new Error(
                "Invalid server response."
            );

        }


        /*
            Backend returned an error.
        */

        if (!response.ok) {

            showError(

                data.message ||

                "No shipment was found for this tracking code."

            );

            return;

        }


        /*
            Save shipment locally.
        */

        currentShipmentData =
            data;


        /*
            -------------------------------------------------
            DISPLAY SHIPMENT IMMEDIATELY
            -------------------------------------------------

            IMPORTANT:

            We DO NOT wait for:

            - Map
            - Nominatim
            - OSRM
            - Map tiles
        */

        displayShipment(
            data
        );


        /*
            Show customer the result immediately.
        */

        showShipmentContent();


        /*
            -------------------------------------------------
            LOAD MAP IN BACKGROUND
            -------------------------------------------------

            No await here.
        */

        initializeShipmentMap(
            data
        )
        .catch(
            error => {

                console.warn(

                    "Background map initialization failed:",

                    error

                );

            }
        );


        /*
            Start automatic refresh.
        */

        startAutomaticRefresh();


    } catch (error) {

        console.error(

            "Shipment loading error:",

            error

        );


        showError(

            "Unable to connect to the tracking server. Please check your internet connection and try again."

        );

    }

}


/* =========================================================
   DISPLAY SHIPMENT
========================================================= */

function displayShipment(data) {

    /*
        BASIC SHIPMENT INFORMATION
    */

    setText(
        "trackingNumber",
        data.trackingCode
    );


    setText(
        "shipmentStatus",
        data.status
    );


    setText(
        "shipmentType",

        data.shipmentType ||

        data.type ||

        "Standard Shipment"

    );


    setText(
        "packageName",

        data.packageName ||

        data.package ||

        "General Package"

    );


    setText(
        "packageWeight",

        data.weight ||

        "Not provided"

    );


    setText(
        "shippingMethod",

        data.shippingMethod ||

        "Not provided"

    );


    setText(
        "estimatedDelivery",

        data.estimatedDelivery ||

        "Not provided"

    );


    setText(
        "lastUpdated",

        formatDate(
            data.updatedAt
        )

    );


    /*
        SENDER
    */

    setText(
        "senderName",

        data.senderName

    );


    setText(
        "senderAddress",

        data.origin

    );


    setText(
        "senderCountry",

        data.senderCountry ||

        extractCountry(
            data.origin
        ) ||

        "Origin location"

    );


    /*
        RECEIVER
    */

    setText(
        "receiverName",

        data.receiverName

    );


    setText(
        "receiverAddress",

        data.destination

    );


    setText(
        "receiverCountry",

        data.receiverCountry ||

        extractCountry(
            data.destination
        ) ||

        "Destination location"

    );


    /*
        PROGRESS
    */

    const progress =
        calculateProgress(
            data.status
        );


    updateProgress(
        progress
    );


    /*
        TRACKING HISTORY
    */

    createTimeline(
        data.history || []
    );


    /*
        CURRENT LOCATION
    */

    setText(
        "currentLocation",

        data.currentLocation

    );

}


/* =========================================================
   SAFE TEXT SETTER
========================================================= */

function setText(id, value) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return;

    }


    element.textContent =

        value !== undefined &&

        value !== null &&

        String(value).trim() !== ""

            ? value

            : "Not available";

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(dateValue) {

    if (!dateValue) {

        return "Not available";

    }


    const date =
        new Date(
            dateValue
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            dateValue
        );

    }


    return date.toLocaleString(

        undefined,

        {

            year: "numeric",

            month: "long",

            day: "numeric",

            hour: "numeric",

            minute: "2-digit"

        }

    );

}


/* =========================================================
   EXTRACT COUNTRY
========================================================= */

function extractCountry(location) {

    if (!location) {

        return "";

    }


    const parts =

        String(location)

            .split(",")

            .map(
                item =>
                    item.trim()
            )

            .filter(Boolean);


    if (
        parts.length >= 2
    ) {

        return parts[
            parts.length - 1
        ];

    }


    return "";

}


/* =========================================================
   CALCULATE PROGRESS
========================================================= */

function calculateProgress(status) {

    const normalized =

        String(status || "")

            .toLowerCase()

            .trim();


    if (
        normalized.includes(
            "created"
        )
    ) {

        return 10;

    }


    if (
        normalized.includes(
            "picked"
        )
    ) {

        return 25;

    }


    if (
        normalized.includes(
            "transit"
        )
    ) {

        return 50;

    }


    if (
        normalized.includes(
            "arrived"
        )
    ) {

        return 70;

    }


    if (
        normalized.includes(
            "out for delivery"
        )
    ) {

        return 90;

    }


    if (
        normalized.includes(
            "delivered"
        )
    ) {

        return 100;

    }


    if (
        normalized.includes(
            "hold"
        )
    ) {

        return 50;

    }


    return 20;

}


/* =========================================================
   UPDATE PROGRESS BAR
========================================================= */

function updateProgress(progress) {

    const safeProgress =

        Math.max(

            0,

            Math.min(

                100,

                Number(progress) || 0

            )

        );


    const fill =

        document.getElementById(
            "progressFill"
        );


    const percentage =

        document.getElementById(
            "progressPercentage"
        );


    if (fill) {

        fill.style.width =
            `${safeProgress}%`;

    }


    if (percentage) {

        percentage.textContent =
            `${safeProgress}%`;

    }

}


/* =========================================================
   CREATE TRACKING TIMELINE
========================================================= */

function createTimeline(history) {

    const timeline =

        document.getElementById(
            "timeline"
        );


    if (!timeline) {

        return;

    }


    timeline.innerHTML = "";


    if (

        !Array.isArray(history) ||

        history.length === 0

    ) {

        timeline.innerHTML = `

            <div class="timeline-empty">

                No shipment updates are available yet.

            </div>

        `;

        return;

    }


    const updates =
        [...history].reverse();


    updates.forEach(

        update => {

            const item =

                document.createElement(
                    "div"
                );


            item.className =
                "timeline-item";


            const location =

                update.location ||

                "Shipment location";


            const status =

                update.status ||

                "Shipment update";


            const date =

                formatDate(
                    update.date
                );


            item.innerHTML = `

                <span class="timeline-dot"></span>

                <div class="timeline-content">

                    <h3>
                        ${escapeHTML(status)}
                    </h3>

                    <p>
                        ${escapeHTML(location)}
                    </p>

                    <span class="timeline-date">
                        ${escapeHTML(date)}
                    </span>

                </div>

            `;


            timeline.appendChild(
                item
            );

        }

    );

}


/* =========================================================
   REQUEST WITH TIMEOUT
========================================================= */

async function fetchWithTimeout(

    url,

    options = {},

    timeout = MAP_REQUEST_TIMEOUT

) {

    const controller =
        new AbortController();


    const timer =
        setTimeout(

            () =>
                controller.abort(),

            timeout

        );


    try {

        return await fetch(

            url,

            {

                ...options,

                signal:
                    controller.signal

            }

        );

    } finally {

        clearTimeout(
            timer
        );

    }

}


/* =========================================================
   INITIALIZE MAP
========================================================= */

async function initializeShipmentMap(data) {

    /*
        Prevent multiple map builds.
    */

    if (mapInitializing) {

        return;

    }


    const mapContainer =
        document.getElementById(
            "map"
        );


    if (!mapContainer) {

        return;

    }


    if (
        typeof L === "undefined"
    ) {

        console.warn(
            "Leaflet has not been loaded."
        );

        return;

    }


    mapInitializing = true;


    try {

        /*
            Remove old map.
        */

        if (map) {

            map.remove();

            map = null;

        }


        routeLayer = null;

        senderMarker = null;

        receiverMarker = null;

        currentMarker = null;


        /*
            Create Leaflet map.
        */

        map =

            L.map(

                "map",

                {

                    zoomControl: true,

                    scrollWheelZoom: false

                }

            );


        /*
            OpenStreetMap tiles.
        */

        L.tileLayer(

            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

            {

                maxZoom: 19,

                attribution:
                    "&copy; OpenStreetMap contributors"

            }

        ).addTo(map);


        map.setView(

            [20, 0],

            2

        );


        /*
            -------------------------------------------------
            GEOCODE ALL LOCATIONS IN PARALLEL
            -------------------------------------------------
        */

        const originPromise =

            geocodeLocation(
                data.origin
            );


        const destinationPromise =

            geocodeLocation(
                data.destination
            );


        let currentPromise;


        if (

            isValidCoordinate(
                data.currentLatitude
            ) &&

            isValidCoordinate(
                data.currentLongitude
            )

        ) {

            currentPromise =

                Promise.resolve({

                    lat:
                        Number(
                            data.currentLatitude
                        ),

                    lng:
                        Number(
                            data.currentLongitude
                        )

                });

        }


        else if (

            isValidCoordinate(
                data.currentLat
            ) &&

            isValidCoordinate(
                data.currentLng
            )

        ) {

            currentPromise =

                Promise.resolve({

                    lat:
                        Number(
                            data.currentLat
                        ),

                    lng:
                        Number(
                            data.currentLng
                        )

                });

        }


        else {

            currentPromise =

                geocodeLocation(
                    data.currentLocation
                );

        }


        const [

            origin,

            destination,

            current

        ] =

            await Promise.all([

                originPromise,

                destinationPromise,

                currentPromise

            ]);


        /*
            If origin/destination cannot be located,
            keep map available.
        */

        if (

            !origin ||

            !destination

        ) {

            showMapMessage(

                "Map route unavailable. Please verify the origin and destination addresses."

            );


            safeInvalidateMap();

            return;

        }


        /*
            SENDER MARKER
        */

        senderMarker =

            L.marker([

                origin.lat,

                origin.lng

            ])

            .addTo(map)

            .bindPopup(`

                <strong>Sender / Origin</strong><br>

                ${escapeHTML(
                    data.origin
                )}

            `);


        /*
            RECEIVER MARKER
        */

        receiverMarker =

            L.marker([

                destination.lat,

                destination.lng

            ])

            .addTo(map)

            .bindPopup(`

                <strong>Receiver / Destination</strong><br>

                ${escapeHTML(
                    data.destination
                )}

            `);


        /*
            CURRENT SHIPMENT MARKER
        */

        if (current) {

            currentMarker =

                L.marker([

                    current.lat,

                    current.lng

                ])

                .addTo(map)

                .bindPopup(`

                    <strong>
                        Current Shipment Location
                    </strong><br>

                    ${escapeHTML(

                        data.currentLocation ||

                        "Current shipment location"

                    )}

                `);

        }


        /*
            DRAW ROUTE.
        */

        await drawShipmentRoute(

            origin,

            destination

        );


        /*
            FIT MAP.
        */

        const points = [

            [

                origin.lat,

                origin.lng

            ],

            [

                destination.lat,

                destination.lng

            ]

        ];


        if (current) {

            points.push([

                current.lat,

                current.lng

            ]);

        }


        if (

            map &&

            points.length >= 2

        ) {

            map.fitBounds(

                L.latLngBounds(
                    points
                ),

                {

                    padding: [

                        40,

                        40

                    ]

                }

            );

        }


        showMapMessage("");


        safeInvalidateMap();


    } catch (error) {

        console.warn(

            "Map initialization failed:",

            error

        );


        showMapMessage(

            "Map is temporarily unavailable."

        );


    } finally {

        mapInitializing = false;

    }

}


/* =========================================================
   SAFE MAP INVALIDATE
========================================================= */

function safeInvalidateMap() {

    setTimeout(

        () => {

            if (map) {

                try {

                    map.invalidateSize();

                } catch (error) {

                    console.warn(

                        "Map resize failed:",

                        error

                    );

                }

            }

        },

        100

    );

}


/* =========================================================
   MAP MESSAGE
========================================================= */

function showMapMessage(message) {

    const mapMessage =

        document.getElementById(
            "mapMessage"
        );


    if (mapMessage) {

        mapMessage.textContent =
            message;

    }

}


/* =========================================================
   CHECK COORDINATE
========================================================= */

function isValidCoordinate(value) {

    if (

        value === undefined ||

        value === null ||

        value === ""

    ) {

        return false;

    }


    const number =
        Number(value);


    return Number.isFinite(
        number
    );

}


/* =========================================================
   GEOCODE LOCATION
========================================================= */

async function geocodeLocation(location) {

    if (!location) {

        return null;

    }


    try {

        const url =

            `https://nominatim.openstreetmap.org/search?` +

            `format=json&limit=1&q=` +

            encodeURIComponent(
                location
            );


        const response =

            await fetchWithTimeout(

                url,

                {

                    method: "GET",

                    headers: {

                        "Accept":
                            "application/json"

                    }

                }

            );


        if (!response.ok) {

            return null;

        }


        const results =

            await response.json();


        if (

            !Array.isArray(results) ||

            results.length === 0

        ) {

            return null;

        }


        const latitude =

            Number(
                results[0].lat
            );


        const longitude =

            Number(
                results[0].lon
            );


        if (

            !Number.isFinite(
                latitude
            ) ||

            !Number.isFinite(
                longitude
            )

        ) {

            return null;

        }


        return {

            lat:
                latitude,

            lng:
                longitude

        };

    } catch (error) {

        /*
            Map service failure must NEVER
            break shipment tracking.
        */

        console.warn(

            "Geocoding failed:",

            location,

            error

        );


        return null;

    }

}


/* =========================================================
   DRAW SHIPMENT ROUTE
========================================================= */

async function drawShipmentRoute(

    origin,

    destination

) {

    if (!map) {

        return;

    }


    if (routeLayer) {

        routeLayer.remove();

        routeLayer = null;

    }


    try {

        const url =

            `https://router.project-osrm.org/route/v1/driving/` +

            `${origin.lng},${origin.lat};` +

            `${destination.lng},${destination.lat}` +

            `?overview=full&geometries=geojson`;


        const response =

            await fetchWithTimeout(

                url,

                {},

                MAP_REQUEST_TIMEOUT

            );


        if (!response.ok) {

            throw new Error(

                "Route service unavailable."

            );

        }


        const data =

            await response.json();


        if (

            !data.routes ||

            !data.routes.length

        ) {

            throw new Error(

                "No road route found."

            );

        }


        const coordinates =

            data.routes[0]

                .geometry

                .coordinates;


        const latLngs =

            coordinates.map(

                coordinate => [

                    coordinate[1],

                    coordinate[0]

                ]

            );


        routeLayer =

            L.polyline(

                latLngs,

                {

                    color:
                        "#ff9800",

                    weight:
                        5,

                    opacity:
                        0.85,

                    lineCap:
                        "round",

                    lineJoin:
                        "round"

                }

            )

            .addTo(map);


    } catch (error) {

        console.warn(

            "OSRM route unavailable:",

            error

        );


        /*
            Fast fallback line.
        */

        if (!map) {

            return;

        }


        routeLayer =

            L.polyline(

                [

                    [

                        origin.lat,

                        origin.lng

                    ],

                    [

                        destination.lat,

                        destination.lng

                    ]

                ],

                {

                    color:
                        "#ff9800",

                    weight:
                        4,

                    opacity:
                        0.75,

                    dashArray:
                        "10 8"

                }

            )

            .addTo(map);

    }

}


/* =========================================================
   REFRESH SHIPMENT
========================================================= */

async function refreshShipment() {

    const trackingCode =
        getTrackingCode();


    if (!trackingCode) {

        return;

    }


    try {

        const response =

            await fetch(

                `${API_BASE_URL}/api/shipment/track/${encodeURIComponent(
                    trackingCode
                )}`,

                {

                    method: "GET",

                    cache: "no-store",

                    headers: {

                        "Accept":
                            "application/json"

                    }

                }

            );


        if (!response.ok) {

            return;

        }


        const data =
            await response.json();


        /*
            Update shipment immediately.

            DO NOT rebuild the map every
            3 seconds.
        */

        currentShipmentData =
            data;


        displayShipment(
            data
        );


        /*
            Update current map marker only
            when backend supplies coordinates.
        */

        updateCurrentMapLocation(
            data
        );


    } catch (error) {

        console.warn(

            "Automatic shipment refresh failed:",

            error

        );

    }

}


/* =========================================================
   UPDATE CURRENT MAP LOCATION
========================================================= */

function updateCurrentMapLocation(data) {

    if (!map) {

        return;

    }


    let latitude = null;

    let longitude = null;


    if (

        isValidCoordinate(
            data.currentLatitude
        ) &&

        isValidCoordinate(
            data.currentLongitude
        )

    ) {

        latitude =

            Number(
                data.currentLatitude
            );


        longitude =

            Number(
                data.currentLongitude
            );

    }


    else if (

        isValidCoordinate(
            data.currentLat
        ) &&

        isValidCoordinate(
            data.currentLng
        )

    ) {

        latitude =

            Number(
                data.currentLat
            );


        longitude =

            Number(
                data.currentLng
            );

    }


    /*
        Backend doesn't provide coordinates.
    */

    if (

        latitude === null ||

        longitude === null

    ) {

        return;

    }


    const position = [

        latitude,

        longitude

    ];


    /*
        Existing marker:
        simply move it.
    */

    if (currentMarker) {

        currentMarker.setLatLng(
            position
        );


        currentMarker.bindPopup(`

            <strong>
                Current Shipment Location
            </strong><br>

            ${escapeHTML(

                data.currentLocation ||

                "Current shipment location"

            )}

        `);


        return;

    }


    /*
        Create marker.
    */

    currentMarker =

        L.marker(
            position
        )

        .addTo(map)

        .bindPopup(`

            <strong>
                Current Shipment Location
            </strong><br>

            ${escapeHTML(

                data.currentLocation ||

                "Current shipment location"

            )}

        `);

}


/* =========================================================
   AUTOMATIC REFRESH
========================================================= */

function startAutomaticRefresh() {

    if (refreshTimer) {

        clearInterval(
            refreshTimer
        );

    }


    refreshTimer =

        setInterval(

            refreshShipment,

            REFRESH_INTERVAL

        );

}


/* =========================================================
   STOP AUTOMATIC REFRESH
========================================================= */

function stopAutomaticRefresh() {

    if (refreshTimer) {

        clearInterval(
            refreshTimer
        );


        refreshTimer = null;

    }

}


/* =========================================================
   PAGE VISIBILITY
========================================================= */

document.addEventListener(

    "visibilitychange",

    () => {

        if (document.hidden) {

            stopAutomaticRefresh();

        }

        else {

            refreshShipment();

            startAutomaticRefresh();

        }

    }

);


/* =========================================================
   STOP REFRESH WHEN PAGE CLOSES
========================================================= */

window.addEventListener(

    "beforeunload",

    () => {

        stopAutomaticRefresh();

    }

);


/* =========================================================
   START TRACKING
========================================================= */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        loadShipment();

    }

);