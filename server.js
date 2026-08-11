require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();

const PORT = process.env.PORT || 5000;

// =========================================================
// MIDDLEWARE
// =========================================================

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://dainty-kangaroo-8ed656.netlify.app";

app.use(
    cors({

        origin: FRONTEND_URL,

        credentials: true,

        methods: [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]

    })
);

app.use(
    express.json({

        limit:
            "2mb"

    })
);

app.use(
    express.urlencoded({

        extended:
            true,

        limit:
            "2mb"

    })
);

app.use(
    cookieParser()
);

// =========================================================
// EMAIL CONFIGURATION
// =========================================================

const EMAIL_USER =
    process.env.EMAIL_USER ||
    "globaltracklogisticsxxx@gmail.com";

const EMAIL_PASSWORD =
    process.env.EMAIL_PASSWORD;

const TRACKING_BASE_URL =
    process.env.TRACKING_BASE_URL ||
    "https://dainty-kangaroo-8ed656.netlify.app";

// =========================================================
// ADMIN AUTHENTICATION CONFIGURATION
// =========================================================
//
// Admin credentials are now handled directly here.
//
// Admin Email:
// admin@globaltracklogistics.com
//
// Admin Password:
// Adminjindu
//
// The password itself is NEVER stored as plain text.
// Only its bcrypt hash is stored below.
// =========================================================

const ADMIN_EMAIL =
    process.env.ADMIN_EMAIL;

const ADMIN_PASSWORD_HASH =
    process.env.ADMIN_PASSWORD_HASH;

const JWT_SECRET = 
    process.env.JWT_SECRET;

const ADMIN_COOKIE_NAME =
    "globaltrack_admin_token";

// =========================================================
// SECURITY CHECK
// =========================================================

if (!JWT_SECRET) {

    console.warn(
        "WARNING: JWT_SECRET environment variable is not configured."
    );

}

// =========================================================
// EMAIL TRANSPORTER
// =========================================================

const mailTransporter =
    nodemailer.createTransport({

        service: "gmail",

        auth: {

            user: EMAIL_USER,

            pass: EMAIL_PASSWORD

        }

    });

// =========================================================
// EMAIL HTML SECURITY
// =========================================================

function escapeEmailHTML(value) {

    return String(value ?? "")

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}

// =========================================================
// ADMIN JWT TOKEN
// =========================================================

function createAdminToken() {

    if (!JWT_SECRET) {

        throw new Error(
            "JWT_SECRET is not configured."
        );

    }

    return jwt.sign(

        {
            role: "admin",

            email:
                ADMIN_EMAIL

        },

        JWT_SECRET,

        {
            expiresIn: "8h"
        }

    );

}

// =========================================================
// GET ADMIN TOKEN
// =========================================================

function getAdminToken(req) {

    // First check HTTP-only cookie

    if (
        req.cookies &&
        req.cookies[ADMIN_COOKIE_NAME]
    ) {

        return req.cookies[
            ADMIN_COOKIE_NAME
        ];

    }

    // Also support Authorization header

    const authorization =
        req.headers.authorization;

    if (
        authorization &&
        authorization.startsWith(
            "Bearer "
        )
    ) {

        return authorization.substring(
            7
        );

    }

    return null;

}

// =========================================================
// ADMIN AUTHENTICATION MIDDLEWARE
// =========================================================

function requireAdminAuth(
    req,
    res,
    next
) {

    try {

        if (!JWT_SECRET) {

            return res.status(500).json({

                message:
                    "Server authentication is not configured."

            });

        }

        const token =
            getAdminToken(req);

        if (!token) {

            return res.status(401).json({

                message:
                    "Authentication required."

            });

        }

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );

        if (
            !decoded ||
            decoded.role !== "admin"
        ) {

            return res.status(403).json({

                message:
                    "Administrator access required."

            });

        }

        req.admin = {

            email:
                decoded.email,

            role:
                decoded.role

        };

        next();

    } catch (error) {

        if (
            error.name ===
            "TokenExpiredError"
        ) {

            return res.status(401).json({

                message:
                    "Your admin session has expired. Please log in again."

            });

        }

        return res.status(401).json({

            message:
                "Invalid authentication session."

        });

    }

}

// =========================================================
// ADMIN AUTHENTICATION ROUTES
// =========================================================

// ---------------------------------------------------------
// ADMIN LOGIN
// ---------------------------------------------------------

app.post(
    "/api/admin/login",
    async (req, res) => {

        try {

            const email =
                clean(
                    req.body.email
                ).toLowerCase();

            const password =
                String(
                    req.body.password || ""
                );

            // =================================================
            // SERVER CONFIGURATION CHECK
            // =================================================

            if (
                !ADMIN_EMAIL ||
                !ADMIN_PASSWORD_HASH ||
                !JWT_SECRET
            ) {

                console.error(
                    "Admin authentication configuration is incomplete."
                );

                return res.status(500).json({

                    message:
                        "Admin authentication is not properly configured on the server."

                });

            }

            // =================================================
            // EMAIL CHECK
            // =================================================

            console.log(
                "========== ADMIN LOGIN =========="
            );

            console.log(
                "Received email:",
                JSON.stringify(email)
            );

            console.log(
                "Email matches:",
                email ===
                ADMIN_EMAIL.toLowerCase()
            );

            console.log(
                "Password hash exists:",
                Boolean(
                    ADMIN_PASSWORD_HASH
                )
            );

            console.log(
                "Password hash starts correctly:",
                ADMIN_PASSWORD_HASH
                    ? ADMIN_PASSWORD_HASH.startsWith("$2")
                    : false
            );

            console.log(
                "================================="
            );

            if (
                email !==
                ADMIN_EMAIL.toLowerCase()
            ) {

                console.log(
                    "ADMIN LOGIN FAILED: EMAIL DOES NOT MATCH"
                );

                return res.status(401).json({

                    message:
                        "Invalid administrator email or password."

                });

            }

            // =================================================
            // PASSWORD CHECK
            // =================================================

            const passwordMatches =
                await bcrypt.compare(
                    password,
                    ADMIN_PASSWORD_HASH
                );

            if (!passwordMatches) {

                console.log(
                    "ADMIN LOGIN FAILED: PASSWORD DOES NOT MATCH"
                );

                return res.status(401).json({

                    message:
                        "Invalid administrator email or password."

                });

            }

            // =================================================
            // CREATE JWT
            // =================================================

            const token =
                createAdminToken();

            // =================================================
            // STORE TOKEN IN HTTP-ONLY COOKIE
            // =================================================

            res.cookie(

                ADMIN_COOKIE_NAME,

                token,

                {

                    httpOnly: true,

                    secure:
                        process.env.NODE_ENV ===
                        "production",

                    sameSite:
                        process.env.NODE_ENV ===
                        "production"
                            ? "none"
                            : "lax",

                    maxAge:
                        8 * 60 * 60 * 1000,

                    path: "/"

                }

            );

            console.log(
                `Administrator logged in: ${email}`
            );

            return res.status(200).json({

                message:
                    "Administrator login successful.",

                authenticated:
                    true,

                admin: {

                    email:
                        ADMIN_EMAIL,

                    role:
                        "admin"

                }

            });

        } catch (error) {

            console.error(
                "Admin login error:",
                error
            );

            return res.status(500).json({

                message:
                    "Server error during administrator login."

            });

        }

    }

);

// ---------------------------------------------------------
// ADMIN LOGOUT
// ---------------------------------------------------------

app.post(
    "/api/admin/logout",
    (req, res) => {

        try {

            res.clearCookie(

                ADMIN_COOKIE_NAME,

                {

                    httpOnly: true,

                    secure:
                        process.env.NODE_ENV ===
                        "production",

                    sameSite:
                        process.env.NODE_ENV ===
                        "production"
                            ? "none"
                            : "lax",

                    path: "/"

                }

            );

            return res.status(200).json({

                message:
                    "Administrator logged out successfully.",

                authenticated:
                    false

            });

        } catch (error) {

            console.error(
                "Admin logout error:",
                error
            );

            return res.status(500).json({

                message:
                    "Unable to log out administrator."

            });

        }

    }

);

// ---------------------------------------------------------
// CHECK ADMIN SESSION
// ---------------------------------------------------------

app.get(
    "/api/admin/me",
    requireAdminAuth,
    (req, res) => {

        return res.status(200).json({

            authenticated:
                true,

            admin: {

                email:
                    req.admin.email,

                role:
                    req.admin.role

            }

        });

    }

);

// =========================================================
// SERVE WEBSITE FILES
// =========================================================

app.use(
    express.static(
        __dirname
    )
);

// =========================================================
// SHIPMENT DATABASE
// =========================================================

const shipmentsFile =
    path.join(
        __dirname,
        "shipments.json"
    );

// =========================================================
// DATABASE HELPERS
// =========================================================

function loadShipments() {

    try {

        if (
            !fs.existsSync(
                shipmentsFile
            )
        ) {

            fs.writeFileSync(

                shipmentsFile,

                "[]",

                "utf8"

            );

            return [];

        }

        const data =
            fs.readFileSync(

                shipmentsFile,

                "utf8"

            );

        if (
            !data.trim()
        ) {

            return [];

        }

        const shipments =
            JSON.parse(
                data
            );

        if (
            !Array.isArray(
                shipments
            )
        ) {

            console.warn(
                "shipments.json does not contain an array. Resetting database."
            );

            return [];

        }

        return shipments;

    } catch (error) {

        console.error(
            "Error loading shipments:",
            error
        );

        return [];

    }

}

function saveShipments(
    shipments
) {

    try {

        const temporaryFile =
            `${shipmentsFile}.tmp`;

        fs.writeFileSync(

            temporaryFile,

            JSON.stringify(
                shipments,
                null,
                2
            ),

            "utf8"

        );

        fs.renameSync(

            temporaryFile,

            shipmentsFile

        );

        return true;

    } catch (error) {

        console.error(
            "Error saving shipments:",
            error
        );

        return false;

    }

}

// =========================================================
// UTILITY FUNCTIONS
// =========================================================

function clean(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(
        value
    ).trim();

}

function normalizeTrackingCode(
    code
) {

    return clean(
        code
    ).toUpperCase();

}

function getCurrentDate() {

    return new Date().toISOString();

}

// =========================================================
// SHIPMENT STATUS
// =========================================================

const VALID_STATUSES = [

    "Shipment Created",

    "Picked Up",

    "In Transit",

    "Arrived at Facility",

    "Out for Delivery",

    "Delivered",

    "Custom Hold"

];

function normalizeStatus(
    status
) {

    const value =
        clean(
            status
        );

    if (!value) {

        return "";

    }

    const found =
        VALID_STATUSES.find(

            item =>
                item.toLowerCase() ===
                value.toLowerCase()

        );

    return found || value;

}

function getProgress(
    status
) {

    const value =
        clean(
            status
        ).toLowerCase();

    switch (value) {

        case "shipment created":

            return 10;

        case "picked up":

            return 25;

        case "in transit":

            return 50;

        case "arrived at facility":

            return 65;

        case "out for delivery":

            return 85;

        case "delivered":

            return 100;

        case "custom hold":

            return 45;

        default:

            return 50;

    }

}

// =========================================================
// TRACKING CODE GENERATOR
// =========================================================

function generateTrackingCode() {

    const letters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    const numbers =
        "0123456789";

    let code =
        "GT-";

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        code +=
            letters.charAt(

                Math.floor(

                    Math.random() *
                    letters.length

                )

            );

    }

    code += "-";

    for (
        let i = 0;
        i < 6;
        i++
    ) {

        code +=
            numbers.charAt(

                Math.floor(

                    Math.random() *
                    numbers.length

                )

            );

    }

    return code;

}

function createUniqueTrackingCode(
    shipments
) {

    let code;

    do {

        code =
            generateTrackingCode();

    } while (

        shipments.some(

            shipment =>

                normalizeTrackingCode(
                    shipment.trackingCode
                ) ===
                normalizeTrackingCode(
                    code
                )

        )

    );

    return code;

}

// =========================================================
// FIND SHIPMENT
// =========================================================

function findShipment(
    shipments,
    trackingCode
) {

    const normalizedCode =
        normalizeTrackingCode(
            trackingCode
        );

    return shipments.find(

        shipment =>

            normalizeTrackingCode(
                shipment.trackingCode
            ) ===
            normalizedCode

    );

}

function findShipmentIndex(
    shipments,
    trackingCode
) {

    const normalizedCode =
        normalizeTrackingCode(
            trackingCode
        );

    return shipments.findIndex(

        shipment =>

            normalizeTrackingCode(
                shipment.trackingCode
            ) ===
            normalizedCode

    );

}

// =========================================================
// VALIDATE SHIPMENT
// =========================================================

function validateShipmentData(
    data
) {

    const requiredFields = [

        "senderName",

        "receiverName",

        "receiverPhone",

        "origin",

        "destination",

        "currentLocation",

        "status"

    ];

    const missingFields = [];

    for (
        const field of requiredFields
    ) {

        if (
            !clean(
                data[field]
            )
        ) {

            missingFields.push(
                field
            );

        }

    }

    return missingFields;

}

// =========================================================
// SEND SHIPMENT EMAIL
// =========================================================

async function sendShipmentEmail(
    shipment
) {

    if (
        !shipment.customerEmail
    ) {

        console.warn(

            `No customer email provided for ${shipment.trackingCode}.`

        );

        return false;

    }

    if (
        !EMAIL_PASSWORD
    ) {

        console.error(

            "EMAIL_PASSWORD environment variable is not configured."

        );

        return false;

    }

    const trackingLink =

        `${TRACKING_BASE_URL}/track.html?code=${encodeURIComponent(

            shipment.trackingCode

        )}`;

    const mailOptions = {

        from:

            `"GlobalTrack Logistics" <${EMAIL_USER}>`,

        to:

            shipment.customerEmail,

        subject:

            `Shipment Registered - ${shipment.trackingCode}`,

        text:

`Hello ${shipment.receiverName},

Your shipment has been successfully registered with GlobalTrack Logistics.

Shipment Details
----------------
Tracking Number: ${shipment.trackingCode}
Sender: ${shipment.senderName}
Origin: ${shipment.origin}
Destination: ${shipment.destination}
Current Location: ${shipment.currentLocation}
Status: ${shipment.status}
Estimated Delivery: ${shipment.estimatedDelivery || "Not provided"}

You can track your shipment here:

${trackingLink}

Thank you for choosing GlobalTrack Logistics.
`,

        html:

`
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

</head>

<body style="
margin:0;
padding:0;
background:#f4f6f8;
font-family:Arial,Helvetica,sans-serif;
">

<div style="
max-width:620px;
margin:30px auto;
background:#ffffff;
border-radius:12px;
overflow:hidden;
box-shadow:0 4px 18px rgba(0,0,0,0.08);
">

<div style="
background:#111827;
padding:28px;
text-align:center;
">

<h1 style="
margin:0;
color:#ffffff;
font-size:25px;
">

GlobalTrack Logistics

</h1>

<p style="
margin:8px 0 0;
color:#d1d5db;
font-size:14px;
">

Shipment Tracking Notification

</p>

</div>

<div style="
padding:32px;
">

<h2 style="
margin-top:0;
color:#111827;
">

Hello ${escapeEmailHTML(
    shipment.receiverName
)},

</h2>

<p style="
color:#4b5563;
line-height:1.7;
">

Your shipment has been successfully registered
with GlobalTrack Logistics.

</p>

<div style="
background:#f8fafc;
border:1px solid #e5e7eb;
border-radius:10px;
padding:20px;
margin:24px 0;
">

<h3 style="
margin-top:0;
color:#111827;
">

Shipment Details

</h3>

<p>
<strong>Tracking Number:</strong>
${escapeEmailHTML(
    shipment.trackingCode
)}
</p>

<p>
<strong>Sender:</strong>
${escapeEmailHTML(
    shipment.senderName
)}
</p>

<p>
<strong>Origin:</strong>
${escapeEmailHTML(
    shipment.origin
)}
</p>

<p>
<strong>Destination:</strong>
${escapeEmailHTML(
    shipment.destination
)}
</p>

<p>
<strong>Current Location:</strong>
${escapeEmailHTML(
    shipment.currentLocation
)}
</p>

<p>
<strong>Status:</strong>
${escapeEmailHTML(
    shipment.status
)}
</p>

<p>
<strong>Estimated Delivery:</strong>
${escapeEmailHTML(
    shipment.estimatedDelivery ||
    "Not provided"
)}
</p>

</div>

<div style="
text-align:center;
margin:30px 0;
">

<a
href="${trackingLink}"
style="
display:inline-block;
background:#111827;
color:#ffffff;
text-decoration:none;
padding:14px 26px;
border-radius:7px;
font-weight:bold;
"
>

Track Your Shipment

</a>

</div>

<p style="
color:#6b7280;
font-size:13px;
line-height:1.6;
">

You can use the tracking button above to view
the latest information about your shipment.

</p>

</div>

<div style="
background:#f8fafc;
border-top:1px solid #e5e7eb;
padding:20px;
text-align:center;
">

<p style="
margin:0;
color:#6b7280;
font-size:12px;
">

©️ 2026 GlobalTrack Logistics.
All Rights Reserved.

</p>

</div>

</div>

</body>

</html>
`

    };

    try {

        const result =
            await mailTransporter.sendMail(
                mailOptions
            );

        console.log(

            `Shipment email sent successfully to ${shipment.customerEmail}`

        );

        console.log(

            `Email message ID: ${result.messageId}`

        );

        return true;

    } catch (error) {

        console.error(

            "Shipment email failed:",

            error

        );

        return false;

    }

}

// =========================================================
// CREATE SHIPMENT
// ADMIN ONLY
// =========================================================

app.post(

    "/api/shipment/create",

    requireAdminAuth,

    async (req, res) => {

        try {

            const senderName =
                clean(
                    req.body.senderName
                );

            const receiverName =
                clean(
                    req.body.receiverName
                );

            const receiverPhone =
                clean(
                    req.body.receiverPhone
                );

            const customerEmail =
                clean(
                    req.body.customerEmail
                );

            const origin =
                clean(
                    req.body.origin
                );

            const destination =
                clean(
                    req.body.destination
                );

            const currentLocation =
                clean(
                    req.body.currentLocation
                );

            const status =
                normalizeStatus(
                    req.body.status
                );

            const missingFields =
                validateShipmentData({

                    senderName,

                    receiverName,

                    receiverPhone,

                    origin,

                    destination,

                    currentLocation,

                    status

                });

            if (
                missingFields.length > 0
            ) {

                return res.status(400).json({

                    message:
                        "Please provide all shipment details.",

                    missingFields

                });

            }

            const shipments =
                loadShipments();

            const trackingCode =
                createUniqueTrackingCode(
                    shipments
                );

            const now =
                getCurrentDate();

            const shipment = {

                id:
                    `${Date.now()}-${Math.random()
                        .toString(36)
                        .substring(2, 8)}`,

                trackingCode,

                senderName,

                receiverName,

                receiverPhone,

                customerEmail,

                origin,

                destination,

                currentLocation,

                status,

                shipmentType:
                    clean(
                        req.body.shipmentType
                    ),

                packageName:
                    clean(
                        req.body.packageName
                    ),

                weight:
                    clean(
                        req.body.weight
                    ),

                shippingMethod:
                    clean(
                        req.body.shippingMethod
                    ),

                estimatedDelivery:
                    clean(
                        req.body.estimatedDelivery
                    ),

                createdAt:
                    now,

                updatedAt:
                    now,

                history: [

                    {

                        location:
                            origin,

                        status:
                            "Shipment Created",

                        date:
                            now,

                        note:
                            "Shipment was registered successfully."

                    },

                    {

                        location:
                            currentLocation,

                        status:
                            status,

                        date:
                            now,

                        note:
                            "Initial shipment status recorded."

                    }

                ]

            };

            shipments.push(
                shipment
            );

            const saved =
                saveShipments(
                    shipments
                );

            if (!saved) {

                return res.status(500).json({

                    message:
                        "Shipment could not be saved."

                });

            }

            console.log(

                `Shipment created: ${trackingCode}`

            );

            let emailSent =
                false;

            if (
                customerEmail
            ) {

                emailSent =
                    await sendShipmentEmail(
                        shipment
                    );

            } else {

                console.warn(

                    `No customer email supplied for ${trackingCode}.`

                );

            }

            return res.status(201).json({

                message:
                    "Shipment created successfully.",

                trackingCode,

                emailSent,

                shipment: {

                    ...shipment,

                    progress:
                        getProgress(
                            shipment.status
                        )

                }

            });

        } catch (error) {

            console.error(

                "Create shipment error:",

                error

            );

            return res.status(500).json({

                message:
                    "Server error while creating shipment."

            });

        }

    }

);

// =========================================================
// PUBLIC TRACK SHIPMENT
// =========================================================

app.get(

    "/api/shipment/track/:trackingCode",

    (req, res) => {

        try {

            const trackingCode =
                normalizeTrackingCode(
                    req.params.trackingCode
                );

            if (!trackingCode) {

                return res.status(400).json({

                    message:
                        "Please provide a tracking code."

                });

            }

            const shipments =
                loadShipments();

            const shipment =
                findShipment(

                    shipments,

                    trackingCode

                );

            if (!shipment) {

                return res.status(404).json({

                    message:
                        "Shipment not found. Please check your tracking code."

                });

            }

            if (
                !Array.isArray(
                    shipment.history
                )
            ) {

                shipment.history =
                    [];

            }

            const status =
                normalizeStatus(
                    shipment.status
                );

            return res.status(200).json({

                id:
                    shipment.id,

                trackingCode:
                    shipment.trackingCode,

                senderName:
                    shipment.senderName,

                receiverName:
                    shipment.receiverName,

                receiverPhone:
                    shipment.receiverPhone,

                customerEmail:
                    shipment.customerEmail ||
                    "",

                origin:
                    shipment.origin,

                destination:
                    shipment.destination,

                currentLocation:
                    shipment.currentLocation,

                status,

                shipmentType:
                    shipment.shipmentType ||
                    "",

                packageName:
                    shipment.packageName ||
                    "",

                weight:
                    shipment.weight ||
                    "",

                shippingMethod:
                    shipment.shippingMethod ||
                    "",

                estimatedDelivery:
                    shipment.estimatedDelivery ||
                    "",

                createdAt:
                    shipment.createdAt,

                updatedAt:
                    shipment.updatedAt,

                progress:
                    getProgress(
                        status
                    ),

                history:
                    shipment.history,

                sender: {

                    name:
                        shipment.senderName,

                    address:
                        shipment.origin,

                    country:
                        shipment.senderCountry ||
                        ""

                },

                receiver: {

                    name:
                        shipment.receiverName,

                    address:
                        shipment.destination,

                    country:
                        shipment.receiverCountry ||
                        ""

                },

                current: {

                    label:
                        shipment.currentLocation

                }

            });

        } catch (error) {

            console.error(

                "Tracking error:",

                error

            );

            return res.status(500).json({

                message:
                    "Server error while retrieving shipment."

            });

        }

    }

);

// =========================================================
// GET ALL SHIPMENTS
// ADMIN ONLY
// =========================================================

app.get(

    [

        "/api/shipments",

        "/api/shipment/all"

    ],

    requireAdminAuth,

    (req, res) => {

        try {

            const shipments =
                loadShipments();

            shipments.sort(

                (a, b) =>

                    new Date(
                        b.createdAt || 0
                    ) -

                    new Date(
                        a.createdAt || 0
                    )

            );

            const result =
                shipments.map(

                    shipment => ({

                        ...shipment,

                        progress:
                            getProgress(
                                shipment.status
                            )

                    })

                );

            if (
                req.path ===
                "/api/shipment/all"
            ) {

                return res.status(200).json({

                    shipments:
                        result

                });

            }

            return res.status(200).json(
                result
            );

        } catch (error) {

            console.error(

                "Get shipments error:",

                error

            );

            return res.status(500).json({

                message:
                    "Unable to retrieve shipments."

            });

        }

    }

);

// =========================================================
// GET ONE SHIPMENT
// ADMIN ONLY
// =========================================================

app.get(

    "/api/shipment/:trackingCode",

    requireAdminAuth,

    (req, res) => {

        try {

            const trackingCode =
                normalizeTrackingCode(
                    req.params.trackingCode
                );

            const shipments =
                loadShipments();

            const shipment =
                findShipment(

                    shipments,

                    trackingCode

                );

            if (!shipment) {

                return res.status(404).json({

                    message:
                        "Shipment not found."

                });

            }

            return res.status(200).json({

                ...shipment,

                progress:
                    getProgress(
                        shipment.status
                    )

            });

        } catch (error) {

            console.error(

                "Get shipment error:",

                error

            );

            return res.status(500).json({

                message:
                    "Unable to retrieve shipment."

            });

        }

    }

);

// =========================================================
// UPDATE SHIPMENT
// ADMIN ONLY
// =========================================================

app.put(

    "/api/shipment/:trackingCode",

    requireAdminAuth,

    (req, res) => {

        try {

            const trackingCode =
                normalizeTrackingCode(
                    req.params.trackingCode
                );

            const shipments =
                loadShipments();

            const index =
                findShipmentIndex(

                    shipments,

                    trackingCode

                );

            if (index === -1) {

                return res.status(404).json({

                    message:
                        "Shipment not found."

                });

            }

            const shipment =
                shipments[index];

            if (
                !Array.isArray(
                    shipment.history
                )
            ) {

                shipment.history =
                    [];

            }

            const oldData = {

                senderName:
                    clean(
                        shipment.senderName
                    ),

                receiverName:
                    clean(
                        shipment.receiverName
                    ),

                receiverPhone:
                    clean(
                        shipment.receiverPhone
                    ),

                origin:
                    clean(
                        shipment.origin
                    ),

                destination:
                    clean(
                        shipment.destination
                    ),

                currentLocation:
                    clean(
                        shipment.currentLocation
                    ),

                status:
                    normalizeStatus(
                        shipment.status
                    )

            };

            const hasField =
                field =>

                    Object.prototype.hasOwnProperty.call(

                        req.body,

                        field

                    );

            const newSenderName =

                hasField("senderName")

                    ? clean(
                        req.body.senderName
                    )

                    : oldData.senderName;

            const newReceiverName =

                hasField("receiverName")

                    ? clean(
                        req.body.receiverName
                    )

                    : oldData.receiverName;

            const newReceiverPhone =

                hasField("receiverPhone")

                    ? clean(
                        req.body.receiverPhone
                    )

                    : oldData.receiverPhone;

            const newOrigin =

                hasField("origin")

                    ? clean(
                        req.body.origin
                    )

                    : oldData.origin;

            const newDestination =

                hasField("destination")

                    ? clean(
                        req.body.destination
                    )

                    : oldData.destination;

            const newCurrentLocation =

                hasField("currentLocation")

                    ? clean(
                        req.body.currentLocation
                    )

                    : oldData.currentLocation;

            const newStatus =

                hasField("status")

                    ? normalizeStatus(
                        req.body.status
                    )

                    : oldData.status;

            if (

                !newSenderName ||

                !newReceiverName ||

                !newReceiverPhone ||

                !newOrigin ||

                !newDestination ||

                !newCurrentLocation ||

                !newStatus

            ) {

                return res.status(400).json({

                    message:
                        "All shipment information must be provided."

                });

            }

            const changedFields =
                [];

            if (
                newSenderName !==
                oldData.senderName
            ) {

                changedFields.push(
                    "Sender"
                );

            }

            if (
                newReceiverName !==
                oldData.receiverName
            ) {

                changedFields.push(
                    "Receiver"
                );

            }

            if (
                newReceiverPhone !==
                oldData.receiverPhone
            ) {

                changedFields.push(
                    "Receiver Phone"
                );

            }

            if (
                newOrigin !==
                oldData.origin
            ) {

                changedFields.push(
                    "Origin"
                );

            }

            if (
                newDestination !==
                oldData.destination
            ) {

                changedFields.push(
                    "Destination"
                );

            }

            if (
                newCurrentLocation !==
                oldData.currentLocation
            ) {

                changedFields.push(
                    "Current Location"
                );

            }

            if (
                newStatus !==
                oldData.status
            ) {

                changedFields.push(
                    "Status"
                );

            }

            const informationChanged =
                changedFields.length > 0;

            shipment.senderName =
                newSenderName;

            shipment.receiverName =
                newReceiverName;

            shipment.receiverPhone =
                newReceiverPhone;

            shipment.origin =
                newOrigin;

            shipment.destination =
                newDestination;

            shipment.currentLocation =
                newCurrentLocation;

            shipment.status =
                newStatus;

            const updateDate =
                getCurrentDate();

            shipment.updatedAt =
                updateDate;

            if (
                informationChanged
            ) {

                shipment.history.push({

                    location:
                        shipment.currentLocation,

                    status:
                        shipment.status,

                    date:
                        updateDate,

                    note:
                        `Shipment information updated: ${changedFields.join(", ")}.`

                });

            }

            shipments[index] =
                shipment;

            const saved =
                saveShipments(
                    shipments
                );

            if (!saved) {

                return res.status(500).json({

                    message:
                        "Shipment could not be saved."

                });

            }

            console.log(

                `Shipment updated: ${trackingCode}`

            );

            return res.status(200).json({

                message:

                    informationChanged

                        ? "Shipment updated successfully."

                        : "No shipment information was changed.",

                shipment: {

                    ...shipment,

                    progress:
                        getProgress(
                            shipment.status
                        )

                }

            });

        } catch (error) {

            console.error(

                "Update shipment error:",

                error

            );

            return res.status(500).json({

                message:
                    "Server error while updating shipment."

            });

        }

    }

);

// =========================================================
// UPDATE SHIPMENT
// ADMIN.JS COMPATIBILITY ROUTE
// ADMIN ONLY
// =========================================================

app.put(

    "/api/shipment/update/:trackingCode",

    requireAdminAuth,

    (req, res) => {

        try {

            const trackingCode =
                normalizeTrackingCode(
                    req.params.trackingCode
                );

            const shipments =
                loadShipments();

            const index =
                findShipmentIndex(

                    shipments,

                    trackingCode

                );

            if (index === -1) {

                return res.status(404).json({

                    message:
                        "Shipment not found."

                });

            }

            const shipment =
                shipments[index];

            if (
                !Array.isArray(
                    shipment.history
                )
            ) {

                shipment.history =
                    [];

            }

            const oldStatus =
                normalizeStatus(
                    shipment.status
                );

            const oldLocation =
                clean(
                    shipment.currentLocation
                );

            const fields = [

                "senderName",

                "receiverName",

                "receiverPhone",

                "customerEmail",

                "origin",

                "destination",

                "currentLocation",

                "shipmentType",

                "packageName",

                "weight",

                "shippingMethod",

                "estimatedDelivery"

            ];

            const changedFields =
                [];

            fields.forEach(

                field => {

                    if (

                        Object.prototype.hasOwnProperty.call(

                            req.body,

                            field

                        )

                    ) {

                        const newValue =
                            clean(
                                req.body[field]
                            );

                        if (

                            clean(
                                shipment[field]
                            ) !==
                            newValue

                        ) {

                            changedFields.push(
                                field
                            );

                        }

                        shipment[field] =
                            newValue;

                    }

                }

            );

            // =================================================
            // STATUS
            // =================================================

            if (

                Object.prototype.hasOwnProperty.call(

                    req.body,

                    "status"

                )

            ) {

                const newStatus =
                    normalizeStatus(
                        req.body.status
                    );

                if (

                    newStatus !==
                    oldStatus

                ) {

                    changedFields.push(
                        "Status"
                    );

                }

                shipment.status =
                    newStatus;

            }

            // =================================================
            // VALIDATE REQUIRED FIELDS
            // =================================================

            const missingFields =
                validateShipmentData(
                    shipment
                );

            if (
                missingFields.length > 0
            ) {

                return res.status(400).json({

                    message:
                        "All shipment information must be provided.",

                    missingFields

                });

            }

            // =================================================
            // UPDATE TIMESTAMP
            // =================================================

            const updateDate =
                getCurrentDate();

            shipment.updatedAt =
                updateDate;

            // =================================================
            // ADD HISTORY
            // =================================================

            const statusChanged =

                shipment.status !==
                oldStatus;

            const locationChanged =

                clean(
                    shipment.currentLocation
                ) !==
                oldLocation;

            if (
                changedFields.length > 0
            ) {

                let note =

                    `Shipment information updated: ${[

                        ...new Set(
                            changedFields
                        )

                    ].join(", ")}.`;

                if (
                    statusChanged
                ) {

                    note =

                        `Shipment status updated from "${oldStatus}" to "${shipment.status}".`;

                } else if (
                    locationChanged
                ) {

                    note =

                        `Shipment location updated to "${shipment.currentLocation}".`;

                }

                shipment.history.push({

                    location:
                        shipment.currentLocation,

                    status:
                        shipment.status,

                    date:
                        updateDate,

                    note

                });

            }

            shipments[index] =
                shipment;

            const saved =
                saveShipments(
                    shipments
                );

            if (!saved) {

                return res.status(500).json({

                    message:
                        "Shipment could not be saved."

                });

            }

            console.log(

                `Shipment updated: ${trackingCode}`

            );

            return res.status(200).json({

                message:

                    changedFields.length > 0

                        ? "Shipment updated successfully."

                        : "No shipment information was changed.",

                shipment: {

                    ...shipment,

                    progress:
                        getProgress(
                            shipment.status
                        )

                }

            });

        } catch (error) {

            console.error(

                "Admin update shipment error:",

                error

            );

            return res.status(500).json({

                message:
                    "Server error while updating shipment."

            });

        }

    }

);

// =========================================================
// DELETE SHIPMENT
// ADMIN ONLY
// =========================================================

app.delete(

    "/api/shipment/:trackingCode",

    requireAdminAuth,

    (req, res) => {

        try {

            const trackingCode =
                normalizeTrackingCode(
                    req.params.trackingCode
                );

            let shipments =
                loadShipments();

            const originalLength =
                shipments.length;

            shipments =
                shipments.filter(

                    shipment =>

                        normalizeTrackingCode(

                            shipment.trackingCode

                        ) !==
                        trackingCode

                );

            if (

                shipments.length ===
                originalLength

            ) {

                return res.status(404).json({

                    message:
                        "Shipment not found."

                });

            }

            const saved =
                saveShipments(
                    shipments
                );

            if (!saved) {

                return res.status(500).json({

                    message:
                        "Shipment could not be deleted."

                });

            }

            console.log(

                `Shipment deleted: ${trackingCode}`

            );

            return res.status(200).json({

                message:
                    "Shipment deleted successfully."

            });

        } catch (error) {

            console.error(

                "Delete shipment error:",

                error

            );

            return res.status(500).json({

                message:
                    "Server error while deleting shipment."

            });

        }

    }

);

// =========================================================
// HEALTH CHECK
// PUBLIC
// =========================================================

app.get(

    "/api/health",

    (req, res) => {

        return res.status(200).json({

            status:
                "online",

            message:
                "GlobalTrack Logistics server is running.",

            port:
                PORT,

            time:
                getCurrentDate()

        });

    }

);

// =========================================================
// API 404 HANDLER
// =========================================================

app.use(

    "/api",

    (req, res) => {

        return res.status(404).json({

            message:
                "API endpoint not found."

        });

    }

);

// =========================================================
// GLOBAL ERROR HANDLER
// =========================================================

app.use(

    (error, req, res, next) => {

        console.error(

            "Unhandled server error:",

            error

        );

        if (
            res.headersSent
        ) {

            return next(
                error
            );

        }

        return res.status(500).json({

            message:
                "Internal server error."

        });

    }

);

// =========================================================
// SERVER START
// =========================================================

app.listen(

    PORT,

    "0.0.0.0",

    () => {

        console.log("");

        console.log(
            "=========================================="
        );

        console.log(
            "       GLOBALTRACK LOGISTICS SERVER"
        );

        console.log(
            "=========================================="
        );

        console.log(

            `Server running at: http://localhost:${PORT}`

        );

        console.log(

            `Admin Login:       http://localhost:${PORT}/admin-login.html`

        );

        console.log(

            `Admin Dashboard:   http://localhost:${PORT}/admin.html`

        );

        console.log(

            `Tracking Page:     http://localhost:${PORT}/index.html`

        );

        console.log(

            `Shipments API:     http://localhost:${PORT}/api/shipments`

        );

        console.log(

            `Health Check:      http://localhost:${PORT}/api/health`

        );

        console.log(

            "=========================================="

        );

        console.log("");

    }

);