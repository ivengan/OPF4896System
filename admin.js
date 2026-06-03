// admin.js (Firebase v8 compatible)

// Make sure jsPDF is available globally
const { jsPDF } = window.jspdf;

// --- Leave Request Notification Checker ---
async function checkForPendingLeave() {
  const badge = document.getElementById('leaveNotificationBadge');
  if (!badge) return;
  try {
    const pendingQuery = await db.collection('leave_requests').where('status', '==', 'Pending').limit(1).get();
    badge.classList.toggle('hidden', pendingQuery.empty);
  } catch (err) {
    console.error("Error checking for pending leave requests:", err);
  }
}

// --- Navigation ---
function goToApproveLeave() { window.location.href = "approve_leave.html"; }

// --- Report Generation ---
async function openReportGenerator() {
  const currentYear = new Date().getFullYear();
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthOptions = months.reduce((acc, month, index) => {
    acc[index] = month;
    return acc;
  }, {});

  const { value: formValues } = await Swal.fire({
    title: 'Generate Monthly Report',
    html:
      `<select id="swal-month" class="swal2-select">${Object.entries(monthOptions).map(([val, text]) => `<option value="${val}">${text}</option>`).join('')}</select>` +
      `<input id="swal-year" type="number" class="swal2-input" value="${currentYear}" placeholder="Year">`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Generate PDF',
    preConfirm: () => ({
      month: document.getElementById('swal-month').value,
      year: document.getElementById('swal-year').value
    })
  });

  if (formValues) {
    const { year, month } = formValues;
    if (!year || !month) {
      Swal.fire("Error", "Please select a valid month and year.", "error");
      return;
    }
    generateMonthlyReport(parseInt(year), parseInt(month));
  }
}

async function generateMonthlyReport(year, month) {
    Swal.fire({
        title: 'Generating Report',
        text: 'Fetching all required data... Please wait.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const monthName = startDate.toLocaleString('default', { month: 'long' });

    const formatDate = (d, format = 'YYYY-MM-DD') => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        if (format === 'DD-MM-YYYY') return `${day}-${month}-${year}`;
        return `${year}-${month}-${day}`;
    };
    const formatTime = (ts) => ts ? ts.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
  
    try {
        const [staffSnap, attendanceSnap, extraJobsSnap, leaveSnap] = await Promise.all([
            db.collection('staffs').orderBy('name').get(),
            db.collection('attendance').where('date', '>=', formatDate(startDate)).where('date', '<=', formatDate(endDate)).get(),
            db.collection('extra_jobs').where('status', '==', 'approved').where('createdAt', '>=', startDate).where('createdAt', '<=', endDate).get(),
            db.collection('leave_requests').where('status', '==', 'Approved').get()
        ]);

        const allStaff = new Map();
        staffSnap.forEach(doc => {
            const data = doc.data();
            if (data.phone && data.phone !== '01764056458') {
                allStaff.set(data.phone, { name: data.name, role: data.role || 'staff' });
            }
        });
        
        const attendanceByDate = {};
        attendanceSnap.forEach(doc => {
            const data = doc.data();
            if (!attendanceByDate[data.date]) attendanceByDate[data.date] = [];
            attendanceByDate[data.date].push(data);
        });
        const extraJobsByDate = {};
        extraJobsSnap.forEach(doc => {
            const job = doc.data();
            const dateStr = formatDate(job.createdAt.toDate());
            if (!extraJobsByDate[dateStr]) extraJobsByDate[dateStr] = [];
            extraJobsByDate[dateStr].push(job);
        });
        const leavesByPhone = {};
        leaveSnap.forEach(doc => {
            const leave = doc.data();
            if (!leavesByPhone[leave.phone]) leavesByPhone[leave.phone] = [];
            leavesByPhone[leave.phone].push(leave);
        });
        
        const doc = new jsPDF();
        
        Swal.update({ text: 'Building PDF pages... This may take a moment.' });
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStrYYYYMMDD = formatDate(d);
            const dateStrDDMMYYYY = formatDate(d, 'DD-MM-YYYY');

            if (d.getDate() > 1) doc.addPage();

            doc.setFontSize(16);
            doc.text(`Attendance Log Report (${dateStrDDMMYYYY})`, 105, 15, { align: 'center' });
            
            doc.setFontSize(9);
            
            const presentPhones = new Set();
            
            const attendanceBody = [];
            const dailyAttendance = attendanceByDate[dateStrYYYYMMDD] || [];
            dailyAttendance.forEach(att => {
                if (!allStaff.has(att.phone)) return;
                presentPhones.add(att.phone);
                
                if (att.sessions) { // Logic for regular staff
                    att.sessions.forEach(session => {
                        if(session.type !== 'overtime') {
                            const clockInTime = session.clockIn.toDate();
                            const lateTime = new Date(clockInTime); lateTime.setHours(5, 10, 0, 0);
                            const isOnTime = clockInTime <= lateTime;
                            attendanceBody.push([
                                att.name,
                                { content: formatTime(session.clockIn), styles: { textColor: isOnTime ? [0, 0, 0] : [255, 0, 0] } },
                                { content: isOnTime ? 'On time' : 'Late in', styles: { textColor: isOnTime ? [0, 128, 0] : [255, 0, 0] } },
                                formatTime(session.clockOut),
                                '' // Remark column
                            ]);
                        }
                    });
                } else if (att.role === 'driver') { // FIXED: Logic for lorry drivers
                    const statusText = att.status === 'completed' ? 'Completed' : 'Present';
                    attendanceBody.push([
                        `${att.name} (Driver)`,
                        statusText,
                        'N/A',
                        'N/A',
                        ''
                    ]);
                }
            });
            doc.autoTable({ startY: 25, head: [['STAFF NAME', 'CLOCK IN', 'REMARK', 'CLOCK OUT', 'Remark']], body: attendanceBody, headStyles: { fillColor: [41, 128, 185] }, styles: { fontSize: 9 } });

            const absentBody = [];
            allStaff.forEach((staff, phone) => {
                if (!presentPhones.has(phone)) {
                    let reason = 'Absent';
                    const staffLeaves = leavesByPhone[phone] || [];
                    for (const leave of staffLeaves) {
                        const leaveStart = new Date(leave.fromDate); const leaveEnd = new Date(leave.toDate);
                        if (d >= leaveStart && d <= leaveEnd) { reason = leave.type; break; }
                    }
                    absentBody.push([staff.name, reason]);
                }
            });
            if (absentBody.length > 0) doc.autoTable({ head: [['STAFFS ABSENT', 'REASON(s)']], body: absentBody, headStyles: { fillColor: [142, 68, 173] }, styles: { fontSize: 9 } });

            const overtimeBody = [];
            dailyAttendance.forEach(att => {
                if(att.sessions) {
                    att.sessions.forEach(session => {
                        if (session.type === 'overtime') {
                            overtimeBody.push([att.name, formatTime(session.clockIn), formatTime(session.clockOut)]);
                        }
                    });
                }
            });
            if (overtimeBody.length > 0) doc.autoTable({ head: [['OT SESSION - STAFF NAME', 'CLOCK IN', 'CLOCK OUT']], body: overtimeBody, headStyles: { fillColor: [241, 196, 15] }, styles: { fontSize: 9 } });

            const extraJobsBody = [];
            const dailyExtraJobs = extraJobsByDate[dateStrYYYYMMDD] || [];
            dailyExtraJobs.forEach(job => {
                extraJobsBody.push([job.initiatorName, job.approvedBy, job.jobDetails]);
            });
            if (extraJobsBody.length > 0) doc.autoTable({ head: [['EXTRA JOB - STAFF NAME', 'AUTHENTICATOR', 'JOBS']], body: extraJobsBody, headStyles: { fillColor: [231, 84, 128] }, styles: { fontSize: 9 } });
        }

        doc.save(`Monthly_Report_${year}-${String(month + 1).padStart(2, '0')}.pdf`);
        Swal.close();
    
    } catch (err) {
        console.error("Failed to generate report:", err);
        Swal.fire("Error", "An error occurred while generating the report. " + err.message, "error");
    }
}

// --- "OFF WORK!" Functionality ---
async function offWork() {
  const confirmResult = await Swal.fire({
    title: "End Workday for All Staff?",
    text: "This will clock out everyone who is currently clocked in. This action cannot be undone.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Clock Out All",
    cancelButtonText: "Cancel",
    confirmButtonColor: '#d33',
  });
  if (!confirmResult.isConfirmed) return;
  Swal.fire({ title: 'Processing...', text: 'Finding active sessions...', didOpen: () => Swal.showLoading() });
  try {
    const today = new Date().toISOString().split('T')[0];
    const attendanceQuery = await db.collection('attendance').where('date', '==', today).get();
    if (attendanceQuery.empty) {
      Swal.fire("No Records", "No attendance records were found for today.", "info");
      return;
    }
    const batch = db.batch();
    const now = firebase.firestore.Timestamp.now();
    let updatedCount = 0;
    attendanceQuery.forEach(doc => {
      const data = doc.data();
      if (Array.isArray(data.sessions) && data.sessions.length > 0) {
        const lastSession = data.sessions[data.sessions.length - 1];
        if (!lastSession.clockOut) {
          const updatedSessions = [...data.sessions];
          updatedSessions[updatedSessions.length - 1].clockOut = now;
          batch.update(doc.ref, { sessions: updatedSessions });
          updatedCount++;
        }
      }
    });
    if (updatedCount === 0) {
      Swal.fire("All Clear", "No staff members were actively clocked in.", "info");
      return;
    }
    await batch.commit();
    Swal.fire("Success", `Successfully clocked out ${updatedCount} staff member(s).`, "success");
  } catch (err) {
    console.error("OFF WORK error:", err);
    Swal.fire("Error", "Failed to clock out staff. Please check the console for details.", "error");
  }
}

// --- Continuous Work Overtime Logic ---
async function triggerOvertimeTransition() {
    const now = new Date();
    if (now.getHours() < 13 || (now.getHours() === 13 && now.getMinutes() < 30)) {
        Swal.fire("Too Early", "This function can only be run after 1:30 PM.", "warning");
        return;
    }
    const confirmResult = await Swal.fire({
        title: "Start Overtime for Active Staff?",
        text: "This will clock out all active staff at 1:30 PM and start an overtime session for them.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, Start OT",
        cancelButtonText: "Cancel",
    });
    if (!confirmResult.isConfirmed) return;
    Swal.fire({ title: 'Processing...', text: 'Finding active staff members...', didOpen: () => Swal.showLoading() });
    const todayStr = now.toISOString().split('T')[0];
    const overtimeStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 30, 0);
    const overtimeTimestamp = firebase.firestore.Timestamp.fromDate(overtimeStartTime);
    try {
        const attendanceQuery = await db.collection("attendance").where("date", "==", todayStr).get();
        if (attendanceQuery.empty) {
            Swal.fire("No Records", "No attendance records found for today.", "info");
            return;
        }
        const batch = db.batch();
        let updatedCount = 0;
        attendanceQuery.forEach(doc => {
            const data = doc.data();
            if (Array.isArray(data.sessions) && data.sessions.length > 0) {
                const lastSession = data.sessions[data.sessions.length - 1];
                if (!lastSession.clockOut) {
                    const updatedSessions = [...data.sessions];
                    updatedSessions[updatedSessions.length - 1].clockOut = overtimeTimestamp;
                    updatedSessions.push({ clockIn: overtimeTimestamp, clockOut: null, type: "overtime" });
                    batch.update(doc.ref, { sessions: updatedSessions });
                    updatedCount++;
                }
            }
        });
        if (updatedCount > 0) {
            await batch.commit();
            Swal.fire("Success", `Successfully transitioned ${updatedCount} staff to overtime.`, "success");
        } else {
            Swal.fire("All Clear", "No staff members were actively clocked in.", "info");
        }
    } catch (err) {
        console.error("Overtime transition error:", err);
        Swal.fire("Error", "Failed to start overtime. Please check the console for details.", "error");
    }
}

// --- Staff Management ---
const staffForm = document.getElementById('staffForm');
if (staffForm) {
  staffForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const role = document.getElementById('role').value;
    if (!name || !phone) { Swal.fire('Validation Error', 'Name and Phone are required.', 'error'); return; }
    if (!/^\d{10,11}$/.test(phone)) { Swal.fire('Validation Error', 'Phone must be 10 or 11 digits.', 'error'); return; }
    try {
      await db.collection('staffs').add({ name, phone, role, admin: false });
      Swal.fire('Success', 'Staff added successfully.', 'success');
      staffForm.reset();
      loadStaffs();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'An error occurred while adding staff.', 'error');
    }
  });
}

async function loadStaffs() {
    const staffList = document.getElementById('staffList');
    if (!staffList) return;
    staffList.innerHTML = `<div class="text-gray-500">Loading staff list...</div>`;
    try {
        const snapshot = await db.collection('staffs').orderBy('name').get();
        staffList.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.phone === '01764056458') return;
            const div = document.createElement('div');
            div.className = 'p-3 border rounded flex justify-between items-center bg-gray-50';
            const roleText = data.role === 'driver' ? 'Lorry Driver' : 'Staff';
            const phoneText = data.phone || '';
            const adminTag = data.admin ? ` <span class="text-xs bg-purple-200 text-purple-800 font-semibold px-2 py-1 rounded-full">Admin</span>` : '';
            div.innerHTML = `
                <div>
                    <span class="font-semibold">${data.name}</span>${adminTag}
                    <span class="text-gray-600 block sm:inline sm:ml-2">${phoneText} (${roleText})</span>
                </div>
                <div class="flex gap-2">
                    <button class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded" onclick="editStaff('${doc.id}')">Edit</button>
                    <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded" onclick="deleteStaff('${doc.id}', '${data.name}')">Delete</button>
                </div>`;
            staffList.appendChild(div);
        });
    } catch (err) {
        console.error("loadStaffs error:", err);
        staffList.innerHTML = `<div class="text-red-600">Failed to load staff list.</div>`;
    }
}

async function editStaff(id) {
    const docSnap = await db.collection('staffs').doc(id).get();
    if (!docSnap.exists) { return Swal.fire('Error', 'Staff member not found.', 'error'); }
    const staff = docSnap.data();
    const { value: formValues } = await Swal.fire({
        title: 'Edit Staff Details',
        html: `
            <input id="swal-name" class="swal2-input" placeholder="Name" value="${staff.name}">
            <input id="swal-phone" class="swal2-input" placeholder="Phone" value="${staff.phone}">
            <select id="swal-role" class="swal2-select mt-2">
                <option value="staff" ${staff.role === 'staff' || !staff.role ? 'selected' : ''}>Staff</option>
                <option value="driver" ${staff.role === 'driver' ? 'selected' : ''}>Lorry Driver</option>
            </select>
            <label class="flex items-center justify-center mt-4"><input type="checkbox" id="swal-admin" class="mr-2" ${staff.admin ? 'checked' : ''}/> Make Admin</label>`,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => ({
            name: document.getElementById('swal-name').value.trim(),
            phone: document.getElementById('swal-phone').value.trim(),
            role: document.getElementById('swal-role').value,
            admin: document.getElementById('swal-admin').checked
        })
    });
    if (formValues) {
        await db.collection('staffs').doc(id).update(formValues);
        Swal.fire('Success', 'Staff details updated.', 'success');
        loadStaffs();
    }
}

async function deleteStaff(id, name) {
    const result = await Swal.fire({
        title: `Delete ${name}?`,
        text: "This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Delete",
        cancelButtonText: "Cancel"
    });
    if (!result.isConfirmed) return;
    try {
        await db.collection('staffs').doc(id).delete();
        Swal.fire("Deleted", `${name} has been removed.`, "success");
        loadStaffs();
    } catch (err) {
        console.error(err);
        Swal.fire("Error", "Delete operation failed.", "error");
    }
}

// --- Timestamp Editor Modal ---
function openTimestampEditor() { 
  document.getElementById('editTimestampModal').classList.remove('hidden'); 
  loadStaffOptionsForEditor(); 
  document.getElementById('dateSelect').value = new Date().toISOString().split('T')[0];
}
function closeTimestampEditor() { document.getElementById('editTimestampModal').classList.add('hidden'); }
async function loadStaffOptionsForEditor() {
    const staffSelect = document.getElementById("staffSelect");
    if (!staffSelect) return;
    const snapshot = await db.collection('staffs').orderBy('name').get();
    staffSelect.innerHTML = '<option value="">-- Select a Staff Member --</option>';
    snapshot.forEach(doc => {
        const data = doc.data();
        // FIXED: Only show regular staff, not drivers, in this modal.
        if (data.phone && data.phone !== '01764056458' && data.role !== 'driver') {
            const option = document.createElement("option");
            option.value = data.phone;
            option.textContent = `${data.name} (${data.phone})`;
            option.dataset.name = data.name;
            staffSelect.appendChild(option);
        }
    });
}
async function saveTimestampEdits() {
    const staffSelect = document.getElementById("staffSelect");
    const phone = staffSelect.value;
    const staffName = staffSelect.options[staffSelect.selectedIndex].dataset.name;
    const dateStr = document.getElementById("dateSelect").value;
    const clockInVal = document.getElementById("newClockIn").value;
    const clockOutVal = document.getElementById("newClockOut").value;
    if (!phone || !dateStr || !clockInVal) { Swal.fire("Missing Info", "Please select a staff, date, and clock-in time.", "warning"); return; }
    const docId = `${phone}_${dateStr}`;
    const docRef = db.collection('attendance').doc(docId);
    try {
        const newSession = {
            clockIn: firebase.firestore.Timestamp.fromDate(new Date(clockInVal)),
            clockOut: clockOutVal ? firebase.firestore.Timestamp.fromDate(new Date(clockOutVal)) : null,
            type: "manual",
            remark: null
        };
        await db.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            if (!doc.exists) {
                t.set(docRef, { phone, name: staffName, date: dateStr, sessions: [newSession], role: 'staff' });
            } else {
                t.update(docRef, { sessions: [newSession], name: staffName });
            }
        });
        Swal.fire("Success", "Timestamp has been updated successfully.", "success");
        closeTimestampEditor();
    } catch (err) {
        console.error("saveTimestampEdits error:", err);
        Swal.fire("Error", "Failed to save the timestamp. " + err.message, "error");
    }
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
  loadStaffs();
  checkForPendingLeave();
  setInterval(checkForPendingLeave, 20000);
});

// --- Global Function Exposure ---
window.goToApproveLeave = goToApproveLeave;
window.openTimestampEditor = openTimestampEditor;
window.closeTimestampEditor = closeTimestampEditor;
window.saveTimestampEdits = saveTimestampEdits;
window.triggerOvertimeTransition = triggerOvertimeTransition;
window.openReportGenerator = openReportGenerator;
window.offWork = offWork;
window.editStaff = editStaff;
window.deleteStaff = deleteStaff;