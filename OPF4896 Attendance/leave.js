// leave.js (v8 compatible)
document.addEventListener('DOMContentLoaded', function () {
  // DOM references
  const form = document.getElementById("leaveForm");
  const leaveTypeSelect = document.getElementById("leaveType");
  const mcFields = document.getElementById("mcFields");
  const reasonField = document.getElementById("reasonField");
  const otherTypesField = document.getElementById("otherTypesField");
  const phoneInput = document.getElementById("phone");

  if (phoneInput) {
    phoneInput.value = "";
    phoneInput.autocomplete = "off";
  }

  // Show/hide fields based on the main leave type selection
  leaveTypeSelect.addEventListener("change", () => {
    const type = leaveTypeSelect.value;
    mcFields.style.display = type === "MC Leave" ? "block" : "none";
    reasonField.style.display = type === "Annual Leave" ? "block" : "none";
    otherTypesField.style.display = type === "Others" ? "block" : "none";
  });

  // Helper for case-insensitive name comparison
  function normalize(s) {
    return (s || "").trim().toLowerCase();
  }
  
  // Helper to calculate days between two dates
  function calculateLeaveDays(from, to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (toDate < fromDate) return 0; // Invalid range
    const diffTime = Math.abs(toDate - fromDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive of start day
    return diffDays;
  }

  // Form submission handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name")?.value.trim() || "";
    const phone = phoneInput?.value.trim() || "";
    const fromDate = document.getElementById("fromDate")?.value;
    const toDate = document.getElementById("toDate")?.value;
    const leaveType = leaveTypeSelect?.value || "";
    
    // --- Validation ---
    if (!name || !phone || !fromDate || !toDate || !leaveType) {
      Swal.fire("Error", "Please fill in all required fields.", "error");
      return;
    }
    
    const leaveDays = calculateLeaveDays(fromDate, toDate);
    if (leaveDays <= 0) {
      Swal.fire("Invalid Date Range", "The 'To' date must be the same as or after the 'From' date.", "error");
      return;
    }

    let leaveSubtype = "";
    let reasonText = document.getElementById("reason")?.value.trim() || "";
    const mcSerial = (document.getElementById("mcSerial")?.value || "").trim();
    const medicalInstitution = (document.getElementById("medicalInstitution")?.value || "").trim();

    if (leaveType === "MC Leave" && (!mcSerial || !medicalInstitution)) {
      Swal.fire("Missing Info", "Please enter MC Serial Number and Clinic/Hospital.", "warning");
      return;
    }
    if (leaveType === "Annual Leave" && !reasonText) {
      Swal.fire("Missing Reason", "Please enter your reason for leave.", "warning");
      return;
    }
    if (leaveType === "Others") {
      const selectedOther = document.querySelector('input[name="otherLeave"]:checked');
      if (!selectedOther) {
        Swal.fire("Missing Info", "Please select a reason from the 'Other' leave types.", "warning");
        return;
      }
      leaveSubtype = selectedOther.value;

      if (leaveSubtype === "Other reason") {
        const { value: otherReason } = await Swal.fire({
          input: 'textarea',
          inputLabel: 'Please specify your reason',
          inputPlaceholder: 'Type your reason here...',
          showCancelButton: true,
          confirmButtonText: "Submit Reason"
        });
        if (!otherReason || !otherReason.trim()) {
          Swal.fire("Missing Reason", "You must provide a reason for this leave type.", "warning");
          return;
        }
        reasonText = otherReason.trim();
        leaveSubtype = `Other: ${reasonText}`; // Store the detailed reason
      }
    }
    
    // --- Staff Verification ---
    try {
      const snap = await db.collection("staffs").where("phone", "==", phone).limit(1).get();
      if (snap.empty) {
        Swal.fire("Not Found", "Phone number not found in our staff records.", "error");
        return;
      }
      const staffDoc = snap.docs[0].data();
      if (normalize(staffDoc.name) !== normalize(name)) {
        Swal.fire("Mismatch", "The name provided does not match the record for this phone number.", "error");
        return;
      }
    } catch (err) {
      console.error("Staff check error:", err);
      Swal.fire("Error", "Failed to verify staff details. Please try again.", "error");
      return;
    }

    // --- Payload Creation ---
    const finalLeaveType = leaveType === "Others" ? leaveSubtype : leaveType;
    const payload = {
      name,
      phone,
      fromDate,
      toDate,
      days: leaveDays,
      type: finalLeaveType,
      mcSerial: leaveType === "MC Leave" ? mcSerial : "",
      medicalInstitution: leaveType === "MC Leave" ? medicalInstitution : "",
      reason: leaveType === "Annual Leave" ? reasonText : "",
      status: "Pending",
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // --- Submit to Firestore ---
    try {
      await db.collection("leave_requests").add(payload);
      
      // MODIFIED: Custom success message for MC Leave
      let successTitle = "Submitted!";
      let successText = "Your leave request has been submitted for approval.";
      if (leaveType === "MC Leave") {
        successText = "Your MC leave application has been submitted for approval, please submit your Medical Certificate (MC) to your superior.";
      }
      
      await Swal.fire({
        icon: "success",
        title: successTitle,
        text: successText,
        timer: 2500,
        showConfirmButton: false,
      });
      setTimeout(() => { window.close(); }, 1000);
    } catch (err) {
      console.error("Submission failed:", err);
      Swal.fire("Error", "Submission failed: " + err.message, "error");
    }
  });
});