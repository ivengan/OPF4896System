// app.js (Firebase v8 compatible)
const bypassGPSAdmins = ["01764056458", "0176405645"];
const BASE_LAT = 2.230812;
const BASE_LON = 102.530939;
const RADIUS_METERS = 50;

function getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function createTimestamp() { return firebase.firestore.Timestamp.now(); }
function showSuccessAndBlankPage(message) {
    document.body.innerHTML = `<div class="bg-green-500 text-white min-h-screen flex flex-col items-center justify-center text-center p-4"><h1 class="text-4xl font-bold mb-2">Success!</h1><p class="text-lg">${message}</p><p class="text-sm mt-4">You can now close this window.</p></div>`;
}
async function isInsideRadius(phone) {
    if (bypassGPSAdmins.includes(phone)) return true;
    if (!navigator.geolocation) {
        await Swal.fire("Location Error", "Geolocation is not supported by your browser.", "error");
        return false;
    }
    try {
        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }));
        const { latitude, longitude } = pos.coords;
        const toRad = (deg) => deg * (Math.PI / 180);
        const R = 6371000;
        const dLat = toRad(BASE_LAT - latitude);
        const dLon = toRad(BASE_LON - longitude);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(latitude)) * Math.cos(toRad(BASE_LAT)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        if (distance > RADIUS_METERS) {
            await Swal.fire("Out of Range", `You are ${Math.round(distance)} meters away. You must be within ${RADIUS_METERS} meters.`, "error");
            return false;
        }
        return true;
    } catch (err) {
        let message = "Could not get your location. Please ensure location services are enabled.";
        if (err.code === 1) message = "Location access was denied. Please allow location access.";
        await Swal.fire("Location Error", message, "error");
        return false;
    }
}
async function getStaffByPhone(phone) {
    const snap = await db.collection('staffs').where('phone', '==', phone).limit(1).get();
    return snap.empty ? null : snap.docs[0].data();
}
async function getAttendanceRecord(phone, dateString) {
    const docId = `${phone}_${dateString}`;
    const docRef = db.collection('attendance').doc(docId);
    const docSnap = await docRef.get();
    return { ref: docRef, exists: docSnap.exists, data: docSnap.exists ? docSnap.data() : null };
}
async function handleDriverClockIn(staff, phone) {
    const todayString = getTodayDateString();
    const docRef = db.collection('attendance').doc(`${phone}_${todayString}`);
    try {
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            await docRef.set({ phone, name: staff.name, role: 'driver', date: todayString, status: 'present' });
            await Swal.fire("Clocked In", `Welcome, ${staff.name}! Your attendance is recorded.`, "success");
            showSuccessAndBlankPage("Your attendance is recorded.");
        } else {
            const data = docSnap.data();
            if (data.status === 'present') {
                await docRef.update({ status: 'completed' });
                await Swal.fire("Clocked Out", `Goodbye, ${staff.name}! Your attendance is complete.`, "success");
                showSuccessAndBlankPage("Your attendance is complete.");
            } else {
                Swal.fire("Already Completed", "You have already completed your attendance for today.", "info");
            }
        }
    } catch(err) {
        console.error("Driver clock-in error:", err);
        Swal.fire("Error", "An error occurred. Please try again.", "error");
    }
}
async function handleStandardStaffClockIn(staff, phone) {
    if (!(await isInsideRadius(phone))) return;
    const todayString = getTodayDateString();
    const { ref, exists, data } = await getAttendanceRecord(phone, todayString);
    const sessions = (exists && Array.isArray(data.sessions)) ? data.sessions : [];
    const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
    const hasOpenSession = lastSession && !lastSession.clockOut;
    if (hasOpenSession) {
        lastSession.clockOut = createTimestamp();
        await ref.update({ sessions });
        await Swal.fire("Clocked Out", `Goodbye, ${staff.name}! Your clock-out was successful.`, "success");
        showSuccessAndBlankPage("Your clock-out was successful.");
    } else {
        const hasAnySessionToday = sessions.length > 0;
        let sessionType = "normal";
        if (hasAnySessionToday) {
            const result = await Swal.fire({ title: "Start a New Session?", text: "You have already completed a session today. Is this for Overtime (O.T.)?", icon: "question", showCancelButton: true, confirmButtonText: "Yes, start O.T.", cancelButtonText: "No, cancel" });
            if (!result.isConfirmed) return;
            sessionType = "overtime";
        }
        const newSession = { clockIn: createTimestamp(), clockOut: null, type: sessionType };
        sessions.push(newSession);
        if (exists) {
            await ref.update({ sessions });
        } else {
            await ref.set({ phone, name: staff.name, role: 'staff', date: todayString, sessions });
        }
        const successMessage = `Welcome, ${staff.name}! Your ${sessionType} clock-in was successful.`;
        await Swal.fire(sessionType === 'normal' ? "Clocked In" : "Overtime Started", successMessage, "success");
        showSuccessAndBlankPage(`Your ${sessionType} clock-in was successful.`);
    }
}
async function handleClockIn() {
    const phoneInput = document.getElementById("phone");
    const phone = phoneInput.value.trim();
    if (!/^\d{10,11}$/.test(phone)) {
        Swal.fire("Invalid Phone", "Please enter a valid 10 or 11 digit phone number.", "error");
        return;
    }
    localStorage.setItem("phone", phone);
    try {
        const staff = await getStaffByPhone(phone);
        if (!staff) {
            Swal.fire("Not Found", "This phone number is not registered to any staff.", "error");
            return;
        }
        if (staff.admin) {
            document.getElementById("adminModal").classList.remove("hidden");
            return;
        }
        phoneInput.value = "";
        if (staff.role === 'driver') {
            await handleDriverClockIn(staff, phone);
        } else {
            await handleStandardStaffClockIn(staff, phone);
        }
    } catch (err) {
        console.error("Clock-in/out error:", err);
        Swal.fire("Error", "An unexpected error occurred. Details: " + err.message, "error");
    }
}
function hideAdminModal() { document.getElementById("adminModal")?.classList.add("hidden"); }
function goToAdminPanel() { window.location.href = "admin.html"; }
window.handleClockIn = handleClockIn;